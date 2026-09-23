const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
// These manifests are shipping artifacts, not regenerated fixtures.
const manifests = ['print-orders/library-sticker-test-drop-001/scan-paths.csv', 'print-orders/drop-001-printer-ready-qr/scan-paths.csv'];
const urls = [...new Set(manifests.flatMap(file => fs.readFileSync(path.join(root, file), 'utf8').match(/https:\/\/neocolumbus\.github\.io\/Project-Columbus\/site\/signal\/[^"\r\n]+/g) || []))];
assert.ok(urls.length >= 16, 'shipping QR inventory missing');
urls.push('https://neocolumbus.github.io/Project-Columbus/site/signal/?drop=001&asset=poster-transit&source=sticker-007&kind=Transit&break=Missing%20shelter&line=The%20stop%20is%20a%20room.&place=Broad%20%26%20High&proof=https%3A%2F%2Fexample.com%2Fevidence#field-card');
urls.push('https://neocolumbus.github.io/Project-Columbus/site/signal/?kind=Legacy%20Signal&line=Keep%20this');
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname.replace(/^\/Project-Columbus\//, '/');
  let file = path.resolve(root, '.' + pathname);
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  try {
    if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    res.setHeader('Content-Type', ({ '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.svg': 'image/svg+xml' })[path.extname(file)] || 'application/octet-stream');
    res.end(fs.readFileSync(file));
  } catch { res.writeHead(404).end(); }
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    for (const original of urls) {
      const url = new URL(original);
      assert.equal(url.pathname, '/Project-Columbus/site/signal/');
      await page.goto(`http://127.0.0.1:${server.address().port}${url.pathname}${url.search}${url.hash}`);
      for (const key of ['kind', 'place', 'break', 'line', 'proof']) {
        if (url.searchParams.has(key)) assert.equal(await page.locator(`#field-${key}`).inputValue(), url.searchParams.get(key), original);
      }
      const card = await page.locator('#field-card-output').inputValue();
      assert.ok(card.includes('https://neocolumbus.github.io/Project-Columbus/site/signal/'));
      for (const key of ['drop', 'asset', 'source']) if (url.searchParams.has(key)) assert.ok(card.includes(`${key}=${url.searchParams.get(key)}`));
      await page.locator('#copy-card-link').click();
      const shared = new URL(await page.evaluate(() => navigator.clipboard.readText()));
      assert.equal(shared.pathname, url.pathname);
      assert.equal(shared.hash, '#field-card');
      for (const [key, value] of url.searchParams) assert.equal(shared.searchParams.get(key), value);
    }
    console.log(`QR contract: ${urls.length} shipping/compatibility URLs passed; no assets regenerated.`);
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
