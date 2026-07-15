const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const pnpm = process.env.PNPM_EXECUTABLE || (process.platform === "win32" ? "pnpm.cmd" : "pnpm");
const signalUrl = "https://neocolumbus.github.io/Project-Columbus/site/signal/";

function quote(value) {
  return `"${String(value).replace(/"/g, '\\"')}"`;
}

function qrFor(name, url) {
  const tmp = path.join(os.tmpdir(), `full-city-${name}.svg`);
  const args = ["dlx", "qrcode", "-t", "svg", "-q", "4", "-o", tmp, url];

  if (process.platform === "win32") {
    const command = `${pnpm} dlx qrcode -t svg -q 4 -o ${quote(tmp)} ${quote(url)}`;
    execFileSync("cmd.exe", ["/d", "/c", command], {
      stdio: ["ignore", "ignore", "inherit"]
    });
  } else {
    execFileSync(pnpm, args, {
      stdio: ["ignore", "ignore", "inherit"]
    });
  }

  const svg = fs.readFileSync(tmp, "utf8");
  const pathMatch = svg.match(/<path stroke="#000000" d="([^"]+)"\/>/);
  const viewBoxMatch = svg.match(/viewBox="([^"]+)"/);

  if (!pathMatch || !viewBoxMatch) {
    throw new Error(`Could not parse QR path for ${name}.`);
  }

  const [, , width, height] = viewBoxMatch[1].trim().split(/\s+/).map(Number);

  return {
    path: pathMatch[1],
    size: Math.max(width || 45, height || 45),
    url
  };
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function qrRect(qr) {
  return `<rect width="${qr.size}" height="${qr.size}" fill="#F6F0E4"/>
      <path stroke="#050606" d="${qr.path}"/>`;
}

function projectSymbol(qr) {
  return `<symbol id="project-qr" viewBox="0 0 ${qr.size} ${qr.size}">
      ${qrRect(qr)}
    </symbol>`;
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function write(relativePath, text) {
  fs.writeFileSync(path.join(root, relativePath), text);
  console.log(`wrote ${relativePath}`);
}

function replaceOrThrow(text, pattern, replacement, file) {
  if (!pattern.test(text)) {
    throw new Error(`Pattern not found in ${file}.`);
  }

  return text.replace(pattern, replacement);
}

const projectQr = qrFor("project-signal", `${signalUrl}#field-card`);
const stickerQr = qrFor("sticker-signal", `${signalUrl}?source=sticker#field-card`);
const sheetQr = qrFor("sheet-signal", `${signalUrl}?source=sticker-sheet#field-card`);
const handbillQr = qrFor("handbill-signal", `${signalUrl}?source=handbill#field-card`);

write("brand/project-qr.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${projectQr.size} ${projectQr.size}" role="img" aria-labelledby="title desc" shape-rendering="crispEdges">
  <title id="title">Full City Columbus Signal QR Code</title>
  <desc id="desc">QR code for ${escapeXml(projectQr.url)}</desc>
  ${qrRect(projectQr)}
</svg>
`);

for (const file of ["street-kit/qr-utility-sheet.svg", "street-kit/sticker-sheet-letter.svg"]) {
  const text = read(file);
  write(
    file,
    replaceOrThrow(
      text,
      /<symbol id="project-qr" viewBox="0 0 [^"]+">[\s\S]*?<\/symbol>/,
      projectSymbol(sheetQr),
      file
    )
  );
}

{
  const file = "street-kit/sticker-sheet-qr.svg";
  const scale = (54 / sheetQr.size).toFixed(6);
  const text = read(file);
  write(
    file,
    replaceOrThrow(
      text,
      /<g transform="translate\(8 6\) scale\([^"]+\)">[\s\S]*?<\/g>/,
      `<g transform="translate(8 6) scale(${scale})">
        ${qrRect(sheetQr)}
      </g>`,
      file
    )
  );
}

{
  const file = "street-kit/qr-sticker.svg";
  const scale = (420 / stickerQr.size).toFixed(6);
  let text = read(file);
  text = text.replace(
    /<desc id="desc">[^<]+<\/desc>/,
    `<desc id="desc">A Full City Columbus sticker with a QR code linking to ${escapeXml(stickerQr.url)}</desc>`
  );
  write(
    file,
    replaceOrThrow(
      text,
      /<g transform="translate\(190 116\) scale\([^"]+\)">[\s\S]*?<\/g>/,
      `<g transform="translate(190 116) scale(${scale})">
    ${qrRect(stickerQr)}
  </g>`,
      file
    )
  );
}

{
  const file = "street-kit/handbill-post-the-signal.svg";
  const scale = (106 / handbillQr.size).toFixed(6);
  let text = read(file);
  text = replaceOrThrow(
    text,
    /<g id="project-qr-code">[\s\S]*?<\/g>/,
    `<g id="project-qr-code">
      ${qrRect(handbillQr)}
    </g>`,
    file
  );
  text = replaceOrThrow(
    text,
    /<use href="#project-qr-code" transform="translate\(10 10\) scale\([^"]+\)"\/>/,
    `<use href="#project-qr-code" transform="translate(10 10) scale(${scale})"/>`,
    file
  );
  write(file, text);
}
