const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const postersDir = path.join(root, "street-kit", "posters");
const pnpm = process.env.PNPM_EXECUTABLE || (process.platform === "win32" ? "pnpm.cmd" : "pnpm");
const signalUrl = "https://neocolumbus.github.io/Project-Columbus/site/signal/";

const posters = [
  {
    id: "001-earthworks-were-first",
    title: "The Earthworks Were First",
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
    title: "The Center Was Here Before The Seal",
    kind: "Neighborhood",
    break: "The center is treated like branding instead of public ground.",
    line: "The center was here before the seal."
  },
  {
    id: "004-pile-of-projects",
    title: "A Pile Of Projects Is Not A City",
    kind: "Neighborhood",
    break: "Disconnected projects are standing in for city form.",
    line: "A pile of projects is not a city."
  },
  {
    id: "005-machine-pays-tribute",
    title: "The Machine Pays Tribute",
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
    title: "COTA Is The Nervous System",
    kind: "Transit",
    break: "Stop lacks shelter, shade, light, crossing, seating, route information, or dignity.",
    line: "Transit is the nervous system."
  },
  {
    id: "008-no-more-half-city",
    title: "No More Half City",
    kind: "Neighborhood",
    break: "This place is treated like a fragment.",
    line: "No more half-city."
  }
];

function qrFor(poster) {
  const source = `poster-${poster.id.slice(0, 3)}`;
  const tmp = path.join(os.tmpdir(), `full-city-${source}.svg`);
  const params = new URLSearchParams({
    drop: "001",
    source,
    kind: poster.kind,
    break: poster.break,
    line: poster.line
  });
  const url = `${signalUrl}?${params.toString()}#field-card`;
  const args = ["dlx", "qrcode", "-t", "svg", "-q", "4", "-o", tmp, url];

  if (process.platform === "win32") {
    const quote = (value) => `"${String(value).replace(/"/g, '\\"')}"`;
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
    throw new Error(`Could not parse QR path for ${source}.`);
  }

  const [, , width, height] = viewBoxMatch[1].trim().split(/\s+/).map(Number);
  const size = Math.max(width || 45, height || 45);

  return {
    path: pathMatch[1],
    size,
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

function renderPoster(poster) {
  const qr = qrFor(poster);
  const scale = 160 / qr.size;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1350" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(poster.title)} With QR</title>
  <desc id="desc">A Drop 001 standalone QR poster linking to ${escapeXml(qr.url)}</desc>
  <image href="${poster.id}.svg" width="1080" height="1350"/>
  <g transform="translate(796 1008)">
    <rect width="196" height="196" fill="#F6F0E4" stroke="#050606" stroke-width="8"/>
    <g transform="translate(18 14) scale(${scale.toFixed(6)})">
      <rect width="${qr.size}" height="${qr.size}" fill="#F6F0E4"/>
      <path stroke="#050606" d="${qr.path}"/>
    </g>
    <text x="98" y="186" text-anchor="middle" fill="#050606" font-family="Arial Black, Impact, sans-serif" font-size="26" letter-spacing="3">SCAN</text>
  </g>
</svg>
`;
}

for (const poster of posters) {
  const target = path.join(postersDir, `${poster.id}-qr.svg`);
  fs.writeFileSync(target, renderPoster(poster));
  console.log(`wrote ${path.relative(root, target)}`);
}
