const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { PDFDocument } = require("pdf-lib");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "drops", "drop-001-second-geometry", "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const outDir = path.join(root, "dist", manifest.drop || "drop-001-second-geometry");

function fileNameFromSource(source) {
  return source
    .replace(/\.svg$/i, "")
    .replace(/^site\/assets\//, "")
    .replace(/^street-kit\/posters\//, "poster-")
    .replace(/^social-kit\/squares\//, "social-square-")
    .replace(/^social-kit\/stories\//, "social-story-")
    .replace(/^brand\//, "brand-")
    .replace(/^street-kit\//, "")
    .replace(/[\/_]+/g, "-")
    .toLowerCase();
}

const assets = (manifest.exportAssets || manifest.sourceAssets.map((source) => ({
  name: fileNameFromSource(source),
  source
}))).map((asset) => [asset.name, asset.source]);

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
      `${manifest.title || "Drop 001"} export bundle`,
      "",
      "Generated from source SVG files.",
      `QR target: ${manifest.scanPath}`,
      `Proof wall: ${manifest.proofPath}`,
      "",
      "Before public release: scan every QR, check every collision, and cut weak assets."
    ].join("\n")
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
