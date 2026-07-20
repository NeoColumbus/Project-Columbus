const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const sharp = require("sharp");
const { PDFDocument } = require("pdf-lib");

const root = path.resolve(__dirname, "..");
const postersDir = path.join(root, "street-kit", "posters");
const outDir = path.join(root, "print-orders", "drop-001-printer-ready-qr");
const stickerSvgDir = path.join(outDir, "source-svg", "stickers");
const posterSvgDir = path.join(outDir, "source-svg", "posters");
const stickerPdfDir = path.join(outDir, "stickers-letter-pdfs");
const posterPdfDir = path.join(outDir, "posters-8x10-pdfs");
const pnpm = process.env.PNPM_EXECUTABLE || (process.platform === "win32" ? "pnpm.cmd" : "pnpm");
const signalUrl = "https://neocolumbus.github.io/Project-Columbus/site/signal/";
const commandEnv = {
  ...process.env,
  PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH || ""}`
};

const posters = [
  {
    id: "001-earthworks-were-first",
    title: "Earthworks Were First",
    kind: "Neighborhood",
    break: "The old center is treated like a blank growth market.",
    line: "The earthworks were first."
  },
  {
    id: "002-signal-seen-confluence",
    title: "Signal Seen Confluence",
    kind: "Neighborhood",
    break: "The confluence is treated like scenery instead of civic center.",
    line: "Signal seen: confluence."
  },
  {
    id: "003-center-before-seal",
    title: "Center Was Here Before",
    kind: "Neighborhood",
    break: "The center is treated like branding instead of public ground.",
    line: "The center was here before the seal."
  },
  {
    id: "004-pile-of-projects",
    title: "Pile Of Projects",
    kind: "Neighborhood",
    break: "Disconnected projects are standing in for city form.",
    line: "A pile of projects is not a city."
  },
  {
    id: "005-machine-pays-tribute",
    title: "Machine Pays Tribute",
    kind: "Machine",
    break: "Water, power, land, tax, compute, or data is being treated as extraction.",
    line: "The machine pays tribute."
  },
  {
    id: "006-report-dead-wall",
    title: "Report A Dead Wall",
    kind: "Dead Wall",
    break: "Blank frontage. Dead street.",
    line: "Density deserves beauty."
  },
  {
    id: "007-cota-nervous-system",
    title: "COTA Nervous System",
    kind: "Transit",
    break: "Stop lacks shelter, shade, light, crossing, seating, route information, or dignity.",
    line: "Transit is the nervous system."
  },
  {
    id: "008-no-more-half-city",
    title: "No More Half-City",
    kind: "Neighborhood",
    break: "This place is treated like a fragment.",
    line: "No more half-city."
  }
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function emptyDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  ensureDir(dir);
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function namespaceIds(svg, prefix) {
  return svg
    .replace(/\bid=(["'])([^"']+)\1/g, (_match, quote, id) => `id=${quote}${prefix}-${id}${quote}`)
    .replace(/\b(href|xlink:href)=(["'])#([^"']+)\2/g, (_match, attr, quote, id) => `${attr}=${quote}#${prefix}-${id}${quote}`)
    .replace(/url\(#([^)]+)\)/g, (_match, id) => `url(#${prefix}-${id})`);
}

function cardUrl(poster, source, asset) {
  const params = new URLSearchParams({
    drop: "001",
    source,
    kind: poster.kind,
    break: poster.break,
    line: poster.line
  });

  if (asset) params.set("asset", asset);

  return `${signalUrl}?${params.toString()}#field-card`;
}

function qrFor(poster, source, asset) {
  const tmp = path.join(os.tmpdir(), `full-city-${source}.svg`);
  const url = cardUrl(poster, source, asset);

  if (process.platform === "win32") {
    const quote = (value) => `"${String(value).replace(/"/g, '\\"')}"`;
    const command = `${pnpm} dlx qrcode -t svg -q 4 -o ${quote(tmp)} ${quote(url)}`;

    execFileSync("cmd.exe", ["/d", "/c", command], {
      stdio: ["ignore", "ignore", "inherit"],
      env: commandEnv
    });
  } else {
    execFileSync(pnpm, ["dlx", "qrcode", "-t", "svg", "-q", "4", "-o", tmp, url], {
      stdio: ["ignore", "ignore", "inherit"],
      env: commandEnv
    });
  }

  const svg = fs.readFileSync(tmp, "utf8");
  const pathMatch = svg.match(/<path stroke="#000000" d="([^"]+)"\/>/);
  const viewBoxMatch = svg.match(/viewBox="([^"]+)"/);

  if (!pathMatch || !viewBoxMatch) {
    throw new Error(`Could not parse QR path for ${source}.`);
  }

  const [, , width, height] = viewBoxMatch[1].trim().split(/\s+/).map(Number);
  const size = Math.max(width || 45, height || 45);

  return {
    asset: asset || "",
    path: pathMatch[1],
    size,
    source,
    url
  };
}

function parsePoster(id) {
  const text = fs.readFileSync(path.join(postersDir, `${id}.svg`), "utf8");
  const svgMatch = text.match(/<svg\b([^>]*)>([\s\S]*?)<\/svg>\s*$/);

  if (!svgMatch) {
    throw new Error(`Could not parse poster SVG: ${id}`);
  }

  const viewBoxMatch = svgMatch[1].match(/\bviewBox="([^"]+)"/);

  if (!viewBoxMatch) {
    throw new Error(`Poster has no viewBox: ${id}`);
  }

  const [minX, minY, width, height] = viewBoxMatch[1].trim().split(/\s+/).map(Number);
  const body = namespaceIds(
    svgMatch[2]
      .replace(/<title\b[\s\S]*?<\/title>\s*/g, "")
      .replace(/<desc\b[\s\S]*?<\/desc>\s*/g, "")
      .trim(),
    `pr${id.slice(0, 3)}`
  );

  return { minX, minY, width, height, body };
}

function inlinePoster(id, width, height, clipId) {
  const poster = parsePoster(id);
  const scaleX = width / poster.width;
  const scaleY = height / poster.height;
  const translateX = -poster.minX * scaleX;
  const translateY = -poster.minY * scaleY;

  return `<g clip-path="url(#${clipId})">
      <g transform="matrix(${scaleX.toFixed(6)} 0 0 ${scaleY.toFixed(6)} ${translateX.toFixed(6)} ${translateY.toFixed(6)})">
        ${poster.body.split("\n").join("\n        ")}
      </g>
    </g>`;
}

function renderSticker(poster, qr) {
  const scale = (244 / qr.size).toFixed(6);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2550 3300" role="img" aria-labelledby="title desc">
  <title id="title">Drop 001 ${escapeXml(poster.title)} Printer Ready Sticker</title>
  <desc id="desc">A letter-size printer-ready sticker with a distinct QR code linking to ${escapeXml(qr.url)}.</desc>
  <defs>
    <clipPath id="single-poster">
      <rect width="1640" height="2050" rx="44"/>
    </clipPath>
    <g id="single-frame">
      <rect x="-48" y="-48" width="1736" height="2506" rx="74" fill="#F6F0E4"/>
      <rect x="-48" y="-48" width="1736" height="2506" rx="74" fill="none" stroke="#050606" stroke-width="18"/>
    </g>
    <g id="single-qr">
      <rect width="300" height="360" fill="#F6F0E4" stroke="#050606" stroke-width="14"/>
      <g transform="translate(28 24) scale(${scale})" shape-rendering="crispEdges">
        <rect width="${qr.size}" height="${qr.size}" fill="#F6F0E4"/>
        <path stroke="#050606" d="${qr.path}"/>
      </g>
      <text x="150" y="326" text-anchor="middle" fill="#050606" font-family="Arial Black, Impact, sans-serif" font-size="48" letter-spacing="7">SCAN</text>
    </g>
  </defs>
  <rect width="2550" height="3300" fill="#F6F0E4"/>
  <text x="150" y="194" fill="#050606" font-family="Arial Black, Impact, sans-serif" font-size="74" letter-spacing="5">DROP 001 / STICKER / QR</text>
  <text x="150" y="278" fill="#9D4732" font-family="Arial Black, Impact, sans-serif" font-size="34" letter-spacing="5">${escapeXml(poster.title.toUpperCase())}</text>

  <g transform="translate(455 450)">
    <use href="#single-frame"/>
    ${inlinePoster(poster.id, 1640, 2050, "single-poster")}
    <rect y="2050" width="1640" height="360" fill="#F6F0E4"/>
    <text x="72" y="2200" fill="#050606" font-family="Arial Black, Impact, sans-serif" font-size="44" letter-spacing="5">SCAN THE SIGNAL</text>
    <text x="72" y="2278" fill="#9D4732" font-family="Arial Black, Impact, sans-serif" font-size="26" letter-spacing="4">SOURCE ${escapeXml(qr.source.toUpperCase())} / PRINTER READY</text>
    <use href="#single-qr" transform="translate(1296 2074)"/>
  </g>

  <text x="150" y="3148" fill="#050606" font-family="Arial Black, Impact, sans-serif" font-size="40" letter-spacing="5">LETTER PDF / CUT ONE BIG STICKER / TEST EVERY SCAN</text>
</svg>
`;
}

async function pngBufferFromSvg(svgText) {
  return sharp(Buffer.from(svgText), { density: 300, unlimited: true })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function addPdfPageFromPng(pdf, pngBuffer, width, height) {
  const page = pdf.addPage([width, height]);
  const image = await pdf.embedPng(pngBuffer);

  page.drawImage(image, {
    x: 0,
    y: 0,
    width,
    height
  });
}

async function writeOnePagePdf(pngBuffer, outputPath, width, height) {
  const pdf = await PDFDocument.create();
  await addPdfPageFromPng(pdf, pngBuffer, width, height);
  fs.writeFileSync(outputPath, await pdf.save());
}

function copyPosterSource(id, targetPath) {
  const text = fs.readFileSync(path.join(postersDir, `${id}-qr.svg`), "utf8");
  fs.writeFileSync(targetPath, text);
  return text;
}

function csv(rows) {
  return `${rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n")}\n`;
}

async function main() {
  emptyDir(outDir);
  ensureDir(stickerSvgDir);
  ensureDir(posterSvgDir);
  ensureDir(stickerPdfDir);
  ensureDir(posterPdfDir);

  const stickerBook = await PDFDocument.create();
  const posterBook = await PDFDocument.create();
  const rows = [["type", "file", "source", "asset", "url"]];

  for (const poster of posters) {
    const number = poster.id.slice(0, 3);
    const stickerSource = `sticker-${number}`;
    const stickerAsset = `${poster.id}-sticker`;
    const stickerQr = qrFor(poster, stickerSource, stickerAsset);
    const stickerStem = `${poster.id}-sticker-qr-letter`;
    const stickerSvg = renderSticker(poster, stickerQr);
    const stickerSvgPath = path.join(stickerSvgDir, `${stickerStem}.svg`);
    const stickerPdfPath = path.join(stickerPdfDir, `${stickerStem}.pdf`);

    fs.writeFileSync(stickerSvgPath, stickerSvg);
    const stickerPng = await pngBufferFromSvg(stickerSvg);
    await writeOnePagePdf(stickerPng, stickerPdfPath, 612, 792);
    await addPdfPageFromPng(stickerBook, stickerPng, 612, 792);
    rows.push(["sticker", `stickers-letter-pdfs/${stickerStem}.pdf`, stickerQr.source, stickerQr.asset, stickerQr.url]);
    console.log(`wrote ${path.relative(root, stickerPdfPath)}`);

    const posterSource = `poster-${number}`;
    const posterStem = `${poster.id}-poster-qr-8x10`;
    const posterSvgPath = path.join(posterSvgDir, `${posterStem}.svg`);
    const posterPdfPath = path.join(posterPdfDir, `${posterStem}.pdf`);
    const posterSvg = copyPosterSource(poster.id, posterSvgPath);
    const posterPng = await pngBufferFromSvg(posterSvg);
    const posterUrl = cardUrl(poster, posterSource, "");

    await writeOnePagePdf(posterPng, posterPdfPath, 576, 720);
    await addPdfPageFromPng(posterBook, posterPng, 576, 720);
    rows.push(["poster", `posters-8x10-pdfs/${posterStem}.pdf`, posterSource, "", posterUrl]);
    console.log(`wrote ${path.relative(root, posterPdfPath)}`);
  }

  fs.writeFileSync(path.join(outDir, "full-city-stickers-qr-letter-all.pdf"), await stickerBook.save());
  fs.writeFileSync(path.join(outDir, "full-city-posters-qr-8x10-all.pdf"), await posterBook.save());
  fs.writeFileSync(path.join(outDir, "scan-paths.csv"), csv(rows));
  fs.writeFileSync(
    path.join(outDir, "README.md"),
    [
      "# Drop 001 Printer-Ready QR Pack",
      "",
      "This is the upload folder for the real QR run.",
      "",
      "## Stickers",
      "",
      "- `stickers-letter-pdfs/` has one letter-size PDF per sticker.",
      "- `full-city-stickers-qr-letter-all.pdf` has all 8 sticker pages in one PDF.",
      "",
      "## Posters",
      "",
      "- `posters-8x10-pdfs/` has one 8x10 PDF per poster.",
      "- `full-city-posters-qr-8x10-all.pdf` has all 8 poster pages in one PDF.",
      "- The posters are 4:5 masters. They can scale cleanly to 16x20 without cropping.",
      "",
      "## QR Paths",
      "",
      "- Stickers use `source=sticker-001` through `source=sticker-008`.",
      "- Posters use `source=poster-001` through `source=poster-008`.",
      "- `scan-paths.csv` lists every encoded URL.",
      "",
      "Regenerate from the repo root with `pnpm generate:printer-ready-pack`.",
      "",
      "Scan one proof from each PDF before ordering the full run."
    ].join("\n")
  );

  console.log(`wrote ${path.relative(root, path.join(outDir, "full-city-stickers-qr-letter-all.pdf"))}`);
  console.log(`wrote ${path.relative(root, path.join(outDir, "full-city-posters-qr-8x10-all.pdf"))}`);
  console.log(`wrote ${path.relative(root, path.join(outDir, "scan-paths.csv"))}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
