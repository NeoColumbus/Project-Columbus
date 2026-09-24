const sharp = require('sharp');
const path = require('node:path');
const root = path.resolve(__dirname, '../site/assets');
(async () => {
  for (const [suffix, width] of [['', 1537], ['-mobile', 768]]) {
    for (const format of ['webp', 'jpeg']) {
      const extension = format === 'jpeg' ? 'jpg' : format;
      const output = path.join(root, `neo-columbus-hero${suffix}.${extension}`);
      const result = await sharp(path.join(root, 'neo-columbus-hero.png')).resize({ width, withoutEnlargement: true }).toFormat(format, { quality: 84, mozjpeg: format === 'jpeg' }).toFile(output);
      console.log(path.basename(output), result.size, 'bytes');
    }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
