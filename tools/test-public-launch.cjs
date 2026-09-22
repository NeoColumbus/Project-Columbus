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
  } catch { res.writeHead(404).end(); }
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
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
        const links = await page.locator('a[href],link[href],script[src],img[src]').evaluateAll(nodes => nodes.map(n => n.getAttribute('href') || n.getAttribute('src')).filter(Boolean));
        for (const link of links) {
          const url = new URL(link, base + route);
          if (url.origin !== base) continue;
          assert.equal((await page.request.get(url.href)).status(), 200, `${route}: ${link}`);
          if (url.hash && url.pathname === route) assert.equal(await page.locator(`[id="${decodeURIComponent(url.hash.slice(1))}"]`).count(), 1, link);
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
        if (route === '/site/') await page.locator('#receipts').screenshot({ path: path.join(output, `receipts-${width}.png`) });
      }
    }
    await page.goto(base + '/');
    await page.waitForURL('**/site/');
    assert.equal(await page.locator('h1').count(), 1);
    const params = { drop: '001', asset: 'poster-transit', source: 'sticker-011', kind: 'Transit', break: 'Missing shelter', line: 'The stop is a room.', place: 'Broad & High', proof: 'https://example.com/photo.jpg' };
    await page.goto(base + '/Project-Columbus/site/signal/?' + new URLSearchParams(params));
    for (const key of ['kind', 'break', 'line', 'place', 'proof']) assert.equal(await page.locator(`#field-${key}`).inputValue(), params[key]);
    const card = await page.locator('#field-card-output').inputValue();
    for (const key of ['drop', 'asset', 'source']) assert.ok(card.includes(`${key}=${params[key]}`));
    assert.ok(card.includes('STATE: LEAD'));
    const fallback = new URL(await page.locator('#github-field-report').getAttribute('href'));
    assert.equal(fallback.searchParams.get('body'), card);
    assert.equal(fallback.pathname, '/NeoColumbus/Project-Columbus/issues/new');
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
    await page.route('https://full-city-field-submission.neocolumbus.workers.dev/**', route => route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ok: true, state: 'LEAD', issueNumber: 123 }) }));
    await page.locator('#field-place').fill('Test stop');
    await page.locator('#field-break').fill('Missing shelter');
    await page.locator('#submit-field-card').click();
    await page.waitForFunction(() => document.querySelector('#field-card-status').textContent.includes('123'));
    await page.route('**/proof-data.json', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ entries: [
      { place: 'Unverified lead', status: 'lead', proofUrl: 'https://example.com' },
      { place: 'Unchecked link', status: 'published', proofUrl: 'https://example.com' },
      { place: 'Unsafe link', status: 'published', proofUrl: 'javascript:alert(1)', checkedBy: 'fixture', checkedAt: '2026-09-21', missingPiece: 'Test', line: 'Test' },
      { place: 'Checked fixture', status: 'published', proofUrl: 'https://example.com/evidence', checkedBy: 'fixture', checkedAt: '2026-09-21', missingPiece: 'Test', line: '<script>unsafe</script>' }
    ], openSlots: [] }) }));
    await page.goto(base + '/site/proof/');
    await page.waitForFunction(() => document.querySelector('[data-proof-status]').textContent === '1 checked proof entry');
    assert.equal(await page.locator('.proof-card-entry').count(), 1);
    assert.equal(await page.locator('.proof-card-entry strong').textContent(), 'Checked fixture');
    assert.equal(await page.locator('.proof-card-entry script').count(), 0);
    if (process.env.PUBLIC_ROOT) {
      for (const route of ['/signal/', '/proof/', '/work/']) assert.equal((await page.goto(base + '/Project-Columbus' + route)).status(), 200);
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(base + '/site/');
    assert.equal(await page.locator('.marquee-track').evaluate(el => getComputedStyle(el).animationName), 'none');
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'auto');
    assert.deepEqual(errors, []);
    console.log(`public launch checks passed; screenshots: ${output}`);
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
