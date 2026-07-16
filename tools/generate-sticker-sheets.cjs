const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const posters = [
  "001-earthworks-were-first",
  "002-signal-seen-confluence",
  "003-center-before-seal",
  "004-pile-of-projects",
  "005-machine-pays-tribute",
  "006-report-dead-wall",
  "007-cota-nervous-system",
  "008-no-more-half-city"
];

const letterPosters = [
  "001-earthworks-were-first",
  "002-signal-seen-confluence",
  "003-center-before-seal",
  "007-cota-nervous-system"
];

const stickerTitles = {
  "001-earthworks-were-first": "Earthworks Were First",
  "002-signal-seen-confluence": "Signal Seen Confluence",
  "003-center-before-seal": "Center Was Here Before",
  "004-pile-of-projects": "Pile Of Projects",
  "005-machine-pays-tribute": "Machine Pays Tribute",
  "006-report-dead-wall": "Report A Dead Wall",
  "007-cota-nervous-system": "COTA Nervous System",
  "008-no-more-half-city": "No More Half-City"
};

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function write(relativePath, text) {
  fs.mkdirSync(path.dirname(path.join(root, relativePath)), { recursive: true });
  fs.writeFileSync(path.join(root, relativePath), text);
  console.log(`wrote ${relativePath}`);
}

function extractDef(source, id) {
  const openPattern = new RegExp(`<(?<tag>symbol|g)\\b[^>]*\\bid="${id}"[^>]*>`);
  const match = source.match(openPattern);

  if (!match) {
    throw new Error(`Could not find #${id}.`);
  }

  const tag = match.groups.tag;
  const tagPattern = new RegExp(`<\\/?${tag}\\b[^>]*\\/?>`, "g");
  tagPattern.lastIndex = match.index;

  let depth = 0;
  let current;

  while ((current = tagPattern.exec(source))) {
    const token = current[0];
    const closing = token.startsWith(`</${tag}`);
    const selfClosing = token.endsWith("/>");

    if (closing) {
      depth -= 1;
      if (depth === 0) {
        return source.slice(match.index, tagPattern.lastIndex);
      }
    } else if (!selfClosing) {
      depth += 1;
    }
  }

  throw new Error(`Could not find closing </${tag}> for #${id}.`);
}

function parsePoster(id) {
  const text = read(`street-kit/posters/${id}.svg`);
  const svgMatch = text.match(/<svg\b([^>]*)>([\s\S]*?)<\/svg>\s*$/);

  if (!svgMatch) {
    throw new Error(`Could not parse poster SVG: ${id}`);
  }

  const attrs = svgMatch[1];
  const viewBoxMatch = attrs.match(/\bviewBox="([^"]+)"/);

  if (!viewBoxMatch) {
    throw new Error(`Poster has no viewBox: ${id}`);
  }

  const [minX, minY, width, height] = viewBoxMatch[1].trim().split(/\s+/).map(Number);
  const body = namespaceIds(
    svgMatch[2]
      .replace(/<title\b[\s\S]*?<\/title>\s*/g, "")
      .replace(/<desc\b[\s\S]*?<\/desc>\s*/g, "")
      .trim(),
    `p${id.slice(0, 3)}`
  );

  return { id, minX, minY, width, height, body };
}

function namespaceIds(svg, prefix) {
  return svg
    .replace(/\bid=(["'])([^"']+)\1/g, (_match, quote, id) => `id=${quote}${prefix}-${id}${quote}`)
    .replace(/\b(href|xlink:href)=(["'])#([^"']+)\2/g, (_match, attr, quote, id) => `${attr}=${quote}#${prefix}-${id}${quote}`)
    .replace(/url\(#([^)]+)\)/g, (_match, id) => `url(#${prefix}-${id})`);
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

function sheetSlot(id, x, y, withQr) {
  const qr = withQr ? "\n    <use href=\"#qr-badge\" transform=\"translate(238 296)\"/>" : "";

  return `<g transform="translate(${x} ${y})">
    <use href="#sticker-frame"/>
    ${inlinePoster(id, 320, 400, "poster-sticker")}${qr}
  </g>`;
}

function letterSlot(id, x, y) {
  return `<g transform="translate(${x} ${y})">
    <use href="#letter-frame"/>
    ${inlinePoster(id, 820, 1025, "letter-poster")}
    <use href="#letter-qr" transform="translate(620 790)"/>
  </g>`;
}

function renderStickerSheet({ withQr }) {
  const sourceLetterSheet = read("street-kit/sticker-sheet-letter.svg");
  const projectQr = withQr ? `\n    ${extractDef(sourceLetterSheet, "project-qr")}` : "";
  const qrBadge = withQr
    ? `
    <g id="qr-badge">
      <rect width="70" height="84" fill="#F6F0E4" stroke="#050606" stroke-width="4"/>
      <use href="#project-qr" x="8" y="6" width="54" height="54"/>
      <text x="35" y="75" text-anchor="middle" fill="#050606" font-family="Arial Black, Impact, sans-serif" font-size="11" letter-spacing="2">SCAN</text>
    </g>`
    : "";
  const slots = posters.map((id, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    return sheetSlot(id, col ? 750 : 130, 160 + row * 450, withQr);
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 2050" role="img" aria-labelledby="title desc">
  <title id="title">Drop 001 Poster Sticker Set${withQr ? " With QR" : ""}</title>
  <desc id="desc">A ${withQr ? "QR" : "no-QR"} sticker sheet made from the cleaned Drop 001 poster set. Poster art is inlined for GitHub-safe rendering.</desc>
  <defs>
    <clipPath id="poster-sticker">
      <rect width="320" height="400" rx="14"/>
    </clipPath>
    <g id="sticker-frame">
      <rect x="-14" y="-14" width="348" height="428" rx="22" fill="#F6F0E4"/>
      <rect x="-14" y="-14" width="348" height="428" rx="22" fill="none" stroke="#050606" stroke-width="6"/>
    </g>${projectQr}${qrBadge}
  </defs>
  <rect width="1200" height="2050" fill="#F6F0E4"/>
  <text x="70" y="108" fill="#050606" font-family="Arial Black, Impact, sans-serif" font-size="42" letter-spacing="3">DROP 001 / POSTER STICKER SET${withQr ? " / QR" : ""}</text>

  ${slots.join("\n  ")}

  <text x="70" y="1998" fill="#050606" font-family="Arial Black, Impact, sans-serif" font-size="24" letter-spacing="4">POSTER STICKERS / TRANSIT ADDED / ${withQr ? "QR CORNERS" : "NO QR"}</text>
</svg>
`;
}

function renderLetterSheet() {
  const sourceLetterSheet = read("street-kit/sticker-sheet-letter.svg");
  const projectQr = extractDef(sourceLetterSheet, "project-qr");
  const slots = [
    letterSlot(letterPosters[0], 250, 360),
    letterSlot(letterPosters[1], 1480, 360),
    letterSlot(letterPosters[2], 250, 1710),
    letterSlot(letterPosters[3], 1480, 1710)
  ];

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2550 3300" role="img" aria-labelledby="title desc">
  <title id="title">Drop 001 Letter Sticker Sheet</title>
  <desc id="desc">A letter-size sticker sheet with four larger poster stickers and corner QR badges. Poster art is inlined for GitHub-safe rendering.</desc>
  <defs>
    ${projectQr}
    <clipPath id="letter-poster">
      <rect width="820" height="1025" rx="32"/>
    </clipPath>
    <g id="letter-frame">
      <rect x="-24" y="-24" width="868" height="1073" rx="46" fill="#F6F0E4"/>
      <rect x="-24" y="-24" width="868" height="1073" rx="46" fill="none" stroke="#050606" stroke-width="14"/>
    </g>
    <g id="letter-qr">
      <rect width="176" height="212" fill="#F6F0E4" stroke="#050606" stroke-width="10"/>
      <use href="#project-qr" x="18" y="16" width="140" height="140"/>
      <text x="88" y="190" text-anchor="middle" fill="#050606" font-family="Arial Black, Impact, sans-serif" font-size="28" letter-spacing="4">SCAN</text>
    </g>
  </defs>
  <rect width="2550" height="3300" fill="#F6F0E4"/>
  <text x="150" y="174" fill="#050606" font-family="Arial Black, Impact, sans-serif" font-size="78" letter-spacing="5">DROP 001 / LETTER STICKERS</text>
  <text x="150" y="250" fill="#9D4732" font-family="Arial Black, Impact, sans-serif" font-size="34" letter-spacing="5">BIGGER STICKERS / REAL CORNERS / STREET PACK</text>

  ${slots.join("\n  ")}

  <text x="150" y="3176" fill="#050606" font-family="Arial Black, Impact, sans-serif" font-size="40" letter-spacing="5">PRINT LETTER SIZE / CUT FOUR BIG / TEST EVERY SCAN</text>
</svg>
`;
}

function singleStickerSlot(id, withQr) {
  const transform = withQr ? "translate(455 450)" : "translate(455 570)";
  const frame = withQr ? "single-frame-qr" : "single-frame";
  const qr = withQr
    ? `
    <rect y="2050" width="1640" height="360" fill="#F6F0E4"/>
    <text x="72" y="2200" fill="#050606" font-family="Arial Black, Impact, sans-serif" font-size="44" letter-spacing="5">SCAN THE SIGNAL</text>
    <text x="72" y="2278" fill="#9D4732" font-family="Arial Black, Impact, sans-serif" font-size="26" letter-spacing="4">ONE BIG STICKER / ONE DIRECT ENTRY</text>
    <use href="#single-qr" transform="translate(1296 2074)"/>`
    : "";

  return `<g transform="${transform}">
    <use href="#${frame}"/>
    ${inlinePoster(id, 1640, 2050, "single-poster")}${qr}
  </g>`;
}

function renderSingleStickerPage(id, { withQr }) {
  const sourceLetterSheet = read("street-kit/sticker-sheet-letter.svg");
  const projectQr = withQr ? `\n    ${extractDef(sourceLetterSheet, "project-qr")}` : "";
  const title = stickerTitles[id] || id;
  const label = withQr ? "SINGLE STICKER / QR" : "SINGLE STICKER / NO QR";
  const qrDef = withQr
    ? `
    <g id="single-qr">
      <rect width="300" height="360" fill="#F6F0E4" stroke="#050606" stroke-width="14"/>
      <use href="#project-qr" x="28" y="24" width="244" height="244"/>
      <text x="150" y="326" text-anchor="middle" fill="#050606" font-family="Arial Black, Impact, sans-serif" font-size="48" letter-spacing="7">SCAN</text>
    </g>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2550 3300" role="img" aria-labelledby="title desc">
  <title id="title">Drop 001 ${title} ${label}</title>
  <desc id="desc">A letter-size printable page with one Drop 001 poster sticker. Poster art is inlined for GitHub-safe rendering.</desc>
  <defs>
    <clipPath id="single-poster">
      <rect width="1640" height="2050" rx="44"/>
    </clipPath>
    <g id="single-frame">
      <rect x="-48" y="-48" width="1736" height="2146" rx="74" fill="#F6F0E4"/>
      <rect x="-48" y="-48" width="1736" height="2146" rx="74" fill="none" stroke="#050606" stroke-width="18"/>
    </g>
    <g id="single-frame-qr">
      <rect x="-48" y="-48" width="1736" height="2506" rx="74" fill="#F6F0E4"/>
      <rect x="-48" y="-48" width="1736" height="2506" rx="74" fill="none" stroke="#050606" stroke-width="18"/>
    </g>${projectQr}${qrDef}
  </defs>
  <rect width="2550" height="3300" fill="#F6F0E4"/>
  <text x="150" y="194" fill="#050606" font-family="Arial Black, Impact, sans-serif" font-size="74" letter-spacing="5">DROP 001 / ${label}</text>
  <text x="150" y="278" fill="#9D4732" font-family="Arial Black, Impact, sans-serif" font-size="34" letter-spacing="5">${title.toUpperCase()}</text>

  ${singleStickerSlot(id, withQr)}

  <text x="150" y="3148" fill="#050606" font-family="Arial Black, Impact, sans-serif" font-size="40" letter-spacing="5">PRINT ONE PAGE / CUT ONE BIG STICKER / TEST EVERY SCAN</text>
</svg>
`;
}

write("street-kit/sticker-sheet.svg", renderStickerSheet({ withQr: false }));
write("street-kit/sticker-sheet-qr.svg", renderStickerSheet({ withQr: true }));
write("street-kit/sticker-sheet-letter.svg", renderLetterSheet());

for (const id of posters) {
  write(`street-kit/stickers/${id}-sticker.svg`, renderSingleStickerPage(id, { withQr: false }));
  write(`street-kit/stickers/${id}-sticker-qr.svg`, renderSingleStickerPage(id, { withQr: true }));
}
