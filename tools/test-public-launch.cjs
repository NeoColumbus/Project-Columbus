const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { chromium } = require('playwright');
const root = process.env.PUBLIC_ROOT ? path.resolve(process.env.PUBLIC_ROOT) : path.resolve(__dirname, '..');
const output = process.env.LAUNCH_SCREENSHOTS || fs.mkdtempSync(path.join(os.tmpdir(), 'full-city-launch-'));
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/Project-Columbus(?=\/)/, '');
  let file = path.resolve(root, '.' + pathname);
  if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403).end(); return; }
  try {
    if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  } catch {
    const notFound = path.join(root, '404.html');
    res.writeHead(404, { 'content-type': 'text/html' }).end(fs.existsSync(notFound) ? fs.readFileSync(notFound) : 'Not found');
  }
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  // Layout/QR tests must never contact production verification or intake.
  await page.route('**/config.js', route => route.fulfill({ contentType: 'text/javascript', body: 'window.FULL_CITY_CONFIG={fieldSubmissionEnabled:false};' }));
  page.on('pageerror', error => errors.push(error.message));
  try {
    for (const width of [320, 390, 768, 1100, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ['/site/', '/site/work/', '/site/signal/', '/site/proof/']) {
        const response = await page.goto(base + route);
        assert.equal(response.status(), 200);
        await page.evaluate(() => document.fonts.ready);
        const broken = await page.evaluate(() => [...document.images].filter(img => !img.complete || !img.naturalWidth).map(img => img.src));
        assert.deepEqual(broken, [], route);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `overflow ${route} ${width}`);
        assert.ok(await page.locator('meta[property="og:image"]').getAttribute('content'));
        await page.locator('.skip-link').focus();
        await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(() => document.activeElement.tagName), 'MAIN', 'skip link focuses content');
        const headings = await page.locator('h1,h2,h3,h4,h5,h6').evaluateAll(nodes => nodes.map(n => Number(n.tagName.slice(1))));
        assert.equal(headings[0], 1);
        for (let i=1;i<headings.length;i++) assert.ok(headings[i] <= headings[i-1]+1, `heading order ${route}`);
        const og = new URL(await page.locator('meta[property="og:image"]').getAttribute('content'));
        assert.equal((await page.request.get(base + og.pathname)).status(), 200, 'social preview asset');
        const links = await page.locator('a[href],link[href],script[src],img[src]').evaluateAll(nodes => nodes.map(n => n.getAttribute('href') || n.getAttribute('src')).filter(Boolean));
        for (const link of links) {
          const url = new URL(link, base + route);
          if (url.origin !== base) continue;
          assert.equal((await page.request.get(url.href)).status(), 200, `${route}: ${link}`);
          if (url.hash) {
            if (url.pathname === route) assert.equal(await page.locator(`[id="${decodeURIComponent(url.hash.slice(1))}"]`).count(), 1, link);
            else {
              const html = await (await page.request.get(url.href)).text();
              assert.ok(html.includes(`id="${decodeURIComponent(url.hash.slice(1))}"`), `cross-page anchor ${link}`);
            }
          }
        }
        if (width < 1281) {
          const toggle = page.locator('.nav-toggle');
          await toggle.focus();
          await page.keyboard.press('Enter');
          assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
          assert.equal(await page.locator('.nav').isVisible(), true);
          const boxes = await page.evaluate(() => ({ nav: document.querySelector('.site-header').getBoundingClientRect().bottom, main: document.querySelector('main').getBoundingClientRect().top }));
          assert.ok(boxes.main >= boxes.nav - 1, 'menu must not cover content');
          await page.keyboard.press('Tab');
          assert.equal(await page.evaluate(() => document.activeElement.closest('nav') !== null), true);
          await page.keyboard.press('Escape');
          assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
        }
        await page.screenshot({ path: path.join(output, `${route.split('/')[2] || 'home'}-${width}.png`), fullPage: true });
        await page.screenshot({ path: path.join(output, `${route.split('/')[2] || 'home'}-${width}-viewport.png`) });
        if (route === '/site/') {
          const pause = page.locator('.marquee-pause');
          await pause.focus(); await page.keyboard.press('Enter');
          assert.equal(await pause.getAttribute('aria-pressed'), 'true');
          assert.equal(await page.locator('.marquee-track').evaluate(el => getComputedStyle(el).animationPlayState), 'paused');
          await pause.click();
          assert.equal(await pause.getAttribute('aria-pressed'), 'false');
          const resources = await page.evaluate(() => performance.getEntriesByType('resource').map(r => r.name));
          assert.ok(resources.some(url => url.endsWith(width <= 600 ? 'neo-columbus-hero-mobile.webp' : 'neo-columbus-hero.webp')), `responsive hero ${width}`);
          assert.ok(!resources.some(url => url.endsWith('neo-columbus-hero.png')), 'original hero should not download');
          const boxes = await page.locator('.receipt-card').evaluateAll(nodes => nodes.map(el => { const r = el.getBoundingClientRect(); return { x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width }; }));
          assert.equal(boxes.length, 5);
          for (let i=0;i<boxes.length;i++) for (let j=i+1;j<boxes.length;j++) {
            const a=boxes[i], b=boxes[j];
            assert.ok(a.right <= b.x || b.right <= a.x || a.bottom <= b.y || b.bottom <= a.y, `receipt collision at ${width}`);
          }
          if (width >= 1100) assert.ok(boxes[4].width > boxes[0].width * 1.9, 'fifth receipt must span the row');
          await page.locator('#receipts').screenshot({ path: path.join(output, `receipts-${width}.png`) });
        }
        if (route === '/site/work/') {
          assert.equal(await page.locator('#cota-model .publication-pending').count(), 0);
          assert.equal(await page.locator('#cota-model .button').first().getAttribute('href'), 'https://github.com/ian-gregory94/cota-route-optimization');
          await page.locator('#cota-model').screenshot({ path: path.join(output, `model-${width}.png`) });
        }
      }
    }
    await page.goto(base + '/');
    await page.waitForURL('**/site/');
    assert.equal(await page.locator('h1').count(), 1);
    for (const href of await page.locator('.participation-paths a[href$=".pdf"]').evaluateAll(nodes => nodes.map(n => n.href))) {
      const url = new URL(href);
      assert.equal(url.hostname, 'raw.githubusercontent.com');
      const relative = url.pathname.replace('/NeoColumbus/Project-Columbus/main/', '');
      const file = path.resolve(__dirname, '..', relative);
      assert.ok(fs.readFileSync(file).subarray(0,5).equals(Buffer.from('%PDF-')), 'existing downloadable PDF');
    }
    if (process.env.PUBLIC_ROOT) {
      const missing = await page.request.get(base + '/Project-Columbus/missing-page-fixture');
      assert.equal(missing.status(), 404);
      assert.ok((await missing.text()).includes('This page is a fragment.'));
    }
    const params = { drop: '001', asset: 'poster-transit', source: 'sticker-011', kind: 'Transit', break: 'Missing shelter', line: 'The stop is a room.', place: 'Broad & High', proof: 'https://example.com/photo.jpg' };
    await page.goto(base + '/Project-Columbus/site/signal/?' + new URLSearchParams(params));
    for (const key of ['kind', 'break', 'line', 'place', 'proof']) assert.equal(await page.locator(`#field-${key}`).inputValue(), params[key]);
    const card = await page.locator('#field-card-output').inputValue();
    for (const key of ['drop', 'asset', 'source']) assert.ok(card.includes(`${key}=${params[key]}`));
    assert.ok(card.includes('STATE: LEAD'));
    const fallback = new URL(await page.locator('#github-field-report').getAttribute('href'));
    assert.equal(fallback.pathname, '/NeoColumbus/Project-Columbus/blob/main/SUBMISSIONS.md');
    assert.equal(fallback.search, '', 'no public issue intake fallback');
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.locator('#copy-card-link').click();
    const shared = new URL(await page.evaluate(() => navigator.clipboard.readText()));
    for (const [key, value] of Object.entries(params)) assert.equal(shared.searchParams.get(key), value);
    await page.locator('#copy-field-card').click();
    assert.equal((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n'), card);
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#download-field-card').click();
    const download = await downloadPromise;
    assert.equal(fs.readFileSync(await download.path(), 'utf8'), card);
    for (const [hint, title, kind] of [['cota', 'Transit signal', 'Transit'], ['machine-pays-tribute', 'Infrastructure signal', 'Machine'], ['dead-wall', 'Dead wall signal', 'Dead Wall'], ['neighborhood', 'Neighborhood signal', 'Neighborhood']]) {
      await page.goto(base + '/site/signal/?asset=' + hint);
      assert.equal(await page.locator('#scan-context-title').textContent(), title);
      assert.equal(await page.locator('#field-kind').inputValue(), kind);
    }
    // Historical numbered objects must work without a new QR generation pass.
    for (const [source, kind] of [['poster-005', 'Machine'], ['poster-006', 'Dead Wall'], ['sticker-007', 'Transit'], ['sticker-008', 'Neighborhood']]) {
      const old = new URLSearchParams({ drop: '001', source, kind, break: 'Original missing piece', line: 'Original public line' });
      await page.goto(base + '/Project-Columbus/site/signal/?' + old + '#field-card');
      assert.equal(await page.locator('#field-kind').inputValue(), kind);
      assert.equal(await page.locator('#field-line').inputValue(), 'Original public line');
      assert.equal(await page.locator('#field-break').inputValue(), 'Original missing piece');
      await page.goto(base + '/site/signal/?drop=001&source=' + source);
      assert.equal(await page.locator('#field-kind').inputValue(), kind);
    }
    await page.goto(base + '/site/signal/?kind=Machine&asset=transit');
    assert.equal(await page.locator('#scan-context-title').textContent(), 'Infrastructure signal');
    await page.goto(base + '/site/signal/?kind=Legacy%20Signal&line=Keep%20this');
    assert.equal(await page.locator('#field-kind').inputValue(), 'Legacy Signal');
    assert.equal(await page.locator('#field-line').inputValue(), 'Keep this');
    let submissions = 0;
    await page.route('https://full-city-field-submission.neocolumbus.workers.dev/**', route => { submissions++; return route.fulfill({ status: 202, contentType: 'application/json', body: JSON.stringify({ ok: true, state: 'LEAD', queued: true }) }); });
    await page.locator('#field-place').fill('Test stop');
    await page.locator('#field-break').fill('Missing shelter');
    assert.equal(await page.locator('#submit-field-card').isDisabled(), true);
    assert.equal(await page.locator('#submit-field-card').textContent(), 'Submissions unavailable');
    assert.equal(submissions, 0, 'unconfigured site never sends to legacy public Worker');
    await page.addInitScript(() => {
      window.turnstile = { render(el, options) { const box=document.createElement('div'); box.style.width=options.size==='compact'?'150px':'300px'; box.style.height='65px'; el.appendChild(box); options.callback('fixture-token'); return 1; }, reset() {} };
    });
    await page.route('**/config.js', route => route.fulfill({ contentType: 'text/javascript', body: 'window.FULL_CITY_CONFIG={fieldSubmissionEnabled:true,turnstileSiteKey:"fixture",fieldSubmissionEndpoint:"https://full-city-field-submission.neocolumbus.workers.dev/field-report"};' }));
    await page.goto(base + '/site/signal/?kind=Transit&place=Test%20stop&break=Missing%20shelter&line=The%20stop%20is%20a%20room.');
    for (const width of [320,390,768,1100,1440]) {
      await page.setViewportSize({width,height:900});
      await page.reload();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `enabled verification overflow ${width}`);
      assert.equal(await page.locator('#submit-field-card').textContent(), 'Send to project');
    }
    await page.locator('#submit-field-card').click();
    await page.waitForFunction(() => document.querySelector('#field-card-status').textContent.includes('private screening'));
    assert.equal(submissions, 1);
    for (const [key, limit] of [['place',180],['break',500],['line',240],['proof',900]]) assert.equal(await page.locator('#field-'+key).getAttribute('maxlength'), String(limit));
    assert.equal(await page.locator('#field-break').evaluate(el => el.tagName), 'TEXTAREA');
    await page.unroute('https://full-city-field-submission.neocolumbus.workers.dev/**');
    await page.route('https://full-city-field-submission.neocolumbus.workers.dev/**', route => route.fulfill({ status: 503, contentType:'application/json', body:'{"error":"SECRET internal failure"}' }));
    await page.reload();
    await page.locator('#submit-field-card').click();
    await page.waitForFunction(() => document.querySelector('#field-card-status').textContent.includes('Inbox unavailable'));
    assert.equal(await page.locator('#field-place').inputValue(), 'Test stop');
    assert.equal(await page.locator('#field-card-status').textContent().then(s => s.includes('SECRET')), false);
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable:true, value:{ writeText:async () => { throw new Error('denied'); } } }));
    await page.locator('#copy-field-card').click();
    assert.ok((await page.locator('#field-card-status').textContent()).includes('copy the text below manually'));
    assert.equal(await page.locator('#manual-copy-output').inputValue(), await page.locator('#field-card-output').inputValue());
    await page.locator('#copy-card-link').click();
    assert.ok((await page.locator('#manual-copy-output').inputValue()).includes('/site/signal/?'));
    await page.unroute('https://full-city-field-submission.neocolumbus.workers.dev/**');
    await page.route('https://full-city-field-submission.neocolumbus.workers.dev/**', () => {});
    await page.reload();
    await page.clock.install();
    await page.locator('#submit-field-card').click();
    await page.clock.runFor(46000);
    await page.waitForFunction(() => document.querySelector('#field-card-status').textContent.includes('timed out'));
    assert.equal(await page.locator('#field-break').inputValue(), 'Missing shelter');
    assert.equal(await page.locator('#submit-field-card').isDisabled(), false);
    await page.unroute('https://full-city-field-submission.neocolumbus.workers.dev/**');
    await page.clock.resume();
    await page.route('**/proof-data.json', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ entries: [
      { place: 'Unverified lead', status: 'lead', proofUrl: 'https://example.com' },
      { place: 'Unchecked link', status: 'published', proofUrl: 'https://example.com' },
      { place: 'Unsafe link', status: 'published', proofUrl: 'javascript:alert(1)', checkedBy: 'fixture', checkedAt: '2026-09-21', missingPiece: 'Test', line: 'Test' },
      { id: 'fixture-checked', placeKey: 'morse-road', place: 'Checked fixture', status: 'published', proofUrl: 'https://example.com/evidence', checkedBy: 'fixture', checkedAt: '2026-09-21', missingPiece: 'Test', line: '<script>unsafe</script>' }
    ], openSlots: [] }) }));
    await page.goto(base + '/site/proof/');
    await page.waitForFunction(() => document.querySelector('[data-proof-status]').textContent === '1 checked proof entry');
    assert.equal(await page.locator('.proof-card-entry').count(), 1);
    assert.equal(await page.locator('.proof-card-entry strong').textContent(), 'Checked fixture');
    assert.equal(await page.locator('.proof-card-entry script').count(), 0);
    assert.equal(await page.locator('#record-fixture-checked').count(), 1);
    await page.goto(base + '/site/');
    await page.waitForSelector('[data-place-key="morse-road"] a');
    assert.equal(await page.locator('[data-place-key="morse-road"] a').getAttribute('href'), 'proof/#record-fixture-checked');
    assert.equal(await page.locator('[data-place-key="linden"] a').count(), 0, 'no fabricated links');
    if (process.env.PUBLIC_ROOT) {
      for (const route of ['/signal/', '/proof/', '/work/']) assert.equal((await page.goto(base + '/Project-Columbus' + route)).status(), 200);
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(base + '/site/');
    assert.equal(await page.locator('.receipt-card').count(), 5);
    assert.equal(await page.locator('.receipt-experiment').getAttribute('href'), 'work/#cota-model');
    const numbers = await page.locator('.kicker').allTextContents();
    assert.deepEqual(numbers.filter(t => /^\d{2} \//.test(t)).map(t => t.slice(0,2)), Array.from({ length:17 }, (_,i) => String(i).padStart(2,'0')));
    assert.equal(await page.locator('.marquee-track > span:not([aria-hidden])').count(), 9);
    assert.equal(await page.locator('.hero-links a').first().getAttribute('href'), 'work/');
    assert.equal(await page.locator('.marquee-track').evaluate(el => getComputedStyle(el).animationName), 'none');
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'auto');
    assert.deepEqual(errors, []);
    console.log(`public launch checks passed; screenshots: ${output}`);
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
