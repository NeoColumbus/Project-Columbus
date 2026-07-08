const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { PDFDocument } = require("pdf-lib");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "dist", "drop-001-second-geometry");

const assets = [
  ["brand-signal-mark", "brand/signal-mark.svg"],
  ["brand-signal-mark-mono", "brand/signal-mark-mono.svg"],
  ["brand-project-qr", "brand/project-qr.svg"],
  ["flag-second-geometry", "site/assets/second-geometry-flag.svg"],
  ["poster-001-earthworks-were-first", "street-kit/posters/001-earthworks-were-first.svg"],
  ["poster-002-signal-seen-confluence", "street-kit/posters/002-signal-seen-confluence.svg"],
  ["poster-003-center-before-seal", "street-kit/posters/003-center-before-seal.svg"],
  ["poster-004-pile-of-projects", "street-kit/posters/004-pile-of-projects.svg"],
  ["poster-005-machine-pays-tribute", "street-kit/posters/005-machine-pays-tribute.svg"],
  ["poster-006-report-dead-wall", "street-kit/posters/006-report-dead-wall.svg"],
  ["poster-006-report-dead-wall-qr", "street-kit/posters/006-report-dead-wall-qr.svg"],
  ["sticker-sheet", "street-kit/sticker-sheet.svg"],
  ["sticker-sheet-qr", "street-kit/sticker-sheet-qr.svg"],
  ["qr-sticker", "street-kit/qr-sticker.svg"],
  ["handbill-post-the-signal", "street-kit/handbill-post-the-signal.svg"],
  ["social-square-001-earthworks-were-first", "social-kit/squares/001-earthworks-were-first.svg"],
  ["social-square-002-post-the-signal", "social-kit/squares/002-post-the-signal.svg"],
  ["social-square-003-old-ground-new-machine", "social-kit/squares/003-old-ground-new-machine.svg"],
  ["social-square-004-machine-pays-tribute", "social-kit/squares/004-machine-pays-tribute.svg"],
  ["social-story-001-second-geometry-arrives", "social-kit/stories/001-second-geometry-arrives.svg"],
  ["social-story-002-build-the-body", "social-kit/stories/002-build-the-body.svg"]
];

function readViewBox(file) {
  const text = fs.readFileSync(file, "utf8");
  const match = text.match(/viewBox="([^"]+)"/);
  if (!match) return { width: 1200, height: 1200 };

  const [, , width, height] = match[1].trim().split(/\s+/).map(Number);
  return {
    width: Math.max(1, Math.round(width || 1200)),
    height: Math.max(1, Math.round(height || 1200))
  };
}

async function writePdf(pngBuffer, pdfPath, width, height) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([width, height]);
  const image = await pdf.embedPng(pngBuffer);

  page.drawImage(image, {
    x: 0,
    y: 0,
    width,
    height
  });

  fs.writeFileSync(pdfPath, await pdf.save());
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  for (const [name, relativeSource] of assets) {
    const source = path.join(root, relativeSource);
    const { width, height } = readViewBox(source);
    const pngPath = path.join(outDir, `${name}.png`);
    const pdfPath = path.join(outDir, `${name}.pdf`);

    const pngBuffer = await sharp(source, { density: 144, unlimited: true })
      .png({ compressionLevel: 9 })
      .toBuffer();

    fs.writeFileSync(pngPath, pngBuffer);
    await writePdf(pngBuffer, pdfPath, width, height);

    console.log(`exported ${relativeSource}`);
  }

  fs.writeFileSync(
    path.join(outDir, "README.txt"),
    [
      "Drop 001: Second Geometry export bundle",
      "",
      "Generated from source SVG files.",
      "QR target: https://neocolumbus.github.io/Project-Columbus/signal/",
      "",
      "Before public release: scan every QR, check every collision, and cut weak assets."
    ].join("\n")
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
