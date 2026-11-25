// Compare public markup with the shipping edition, including repeated controls and links.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const baseline = 'b180185d6c9a95958bd846f6f3edbcd61c83fed7';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' });
async function main() {
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
            for (const child of element.childNodes) if (child.nodeType === 3 && child.textContent.trim())
              entries.push(child.textContent.trim().replace(/\s+/g, ' '));
        }
        return entries;
      }, html);
      const original = await inspect(git('show', baseline + ':' + file));
      inventory[file] = original;
      const built = await inspect(fs.readFileSync(path.join('dist/pages', file), 'utf8'));
      for (const item of original) {
        const index = built.indexOf(item);
        if (index < 0) throw Error(file + ' missing ' + item);
        built.splice(index, 1);
      }
    }
    fs.writeFileSync('dist/content-baseline.json', JSON.stringify(inventory, null, 2));
    console.log('Baseline markup preserved across ' + files.length + ' public pages.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
