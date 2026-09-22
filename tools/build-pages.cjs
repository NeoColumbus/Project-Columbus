const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist', 'pages');
// Only public files enter the artifact. Keep both the printed and legacy routes.
fs.mkdirSync(output, { recursive: true });
fs.cpSync(path.join(root, 'site'), output, { recursive: true });
fs.cpSync(path.join(root, 'site'), path.join(output, 'site'), { recursive: true });
fs.copyFileSync(path.join(root, 'index.html'), path.join(output, 'index.html'));
console.log(`Pages artifact: ${output}`);
