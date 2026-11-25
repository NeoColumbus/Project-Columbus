// Compare public markup with the shipping edition, including repeated controls and links.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const baseline = 'b180185d6c9a95958bd846f6f3edbcd61c83fed7';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' });
async function main() {
  const originals = 'street-kit/posters';
  const posters = fs.readdirSync(originals).filter(name => name.endsWith('.svg') && !name.endsWith('-qr.svg')).sort();
  const destination = 'dist/pages/site/assets/posters';
  const assert = require('node:assert/strict');
  assert.deepEqual(fs.readdirSync(destination).sort(), posters, 'Poster inventory changed');
  for (const name of posters) {
    assert.ok(fs.readFileSync(path.join(originals, name)).equals(fs.readFileSync(path.join(destination, name))), name + ' differs from its print original');
  }
  const files = git('ls-tree', '-r', '--name-only', baseline).trim().split('\n')
    .filter(file => file === 'index.html' || /^site\/.*\.html$/.test(file));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const inventory = {};
    for (const file of files) {
      const inspect = html => page.evaluate(source => {
        const doc = new DOMParser().parseFromString(source, 'text/html');
        const entries = [];
        for (const element of doc.querySelectorAll('*')) {
          for (const key of ['id','href','src','content','name','type','value','maxlength','alt'])
            if (element.hasAttribute(key)) entries.push(key + '=' + element.getAttribute(key));
          if (!['SCRIPT','STYLE'].includes(element.tagName))
            for (const child of element.childNodes) if (child.nodeType === 3 && child.textContent.trim()) {
              const copy = child.textContent.trim().replace(/\s+/g, ' ');
              entries.push(element.matches('.kicker') ? copy.replace(/^\d{2} \/ /, '') : copy);
            }
        }
        return entries;
      }, html);
      const original = await inspect(git('show', baseline + ':' + file));
      inventory[file] = original;
      const built = await inspect(fs.readFileSync(path.join('dist/pages', file), 'utf8'));
      for (const item of original) {
        // Configuration-dependent messages were replaced by accurate initial states.
        const updated = new Map([
          ['Submissions are unavailable while private intake is configured. You can save a card; saving does not send it to the project.', 'Checking private intake availability.'],
          ['Submissions unavailable', 'Checking availability'],
          ['Private intake is unavailable. You can prepare and save a field card; it will not be submitted.', 'Prepare a field card for private review. Saving a card keeps a local copy.'],
          ['A stop, a crossing, a missing piece. Private intake is unavailable; prepare and save your card for later.', 'A stop, a crossing, a missing piece. Record the condition and keep a local copy.']
        ]);
        const index = built.indexOf(updated.get(item) || item);
        if (index < 0) throw Error(file + ' missing ' + item);
        built.splice(index, 1);
      }
    }
    fs.writeFileSync('dist/content-baseline.json', JSON.stringify(inventory, null, 2));
    console.log('Baseline markup preserved across ' + files.length + ' public pages.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
