#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const issuePath = process.argv[2];

if (!issuePath) {
  console.error("Usage: node tools/publish-proof-from-issue.cjs issue.json");
  process.exit(1);
}

const root = path.resolve(__dirname, "..");
const proofDataPath = process.env.PROOF_DATA_PATH
  ? path.resolve(process.env.PROOF_DATA_PATH)
  : path.join(root, "site", "proof", "proof-data.json");
const proofWallPath = process.env.PROOF_WALL_PATH
  ? path.resolve(process.env.PROOF_WALL_PATH)
  : path.join(root, "submissions", "proof-wall.md");
const resultPath = process.env.PROOF_RESULT_PATH
  ? path.resolve(process.env.PROOF_RESULT_PATH)
  : path.join(root, ".proof-publish-result.json");
const issue = JSON.parse(fs.readFileSync(issuePath, "utf8"));
const body = String(issue.body || "");

function clean(value) {
  return String(value || "")
    .replace(/\r/g, "")
    .replace(/^```(?:txt|md)?\n?/i, "")
    .replace(/\n?```$/i, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function section(name) {
  const pattern = new RegExp(`^##\\s+${escapeRegExp(name)}\\s*\\n([\\s\\S]*?)(?=\\n##\\s+|$)`, "im");
  const match = body.match(pattern);
  return clean(match?.[1] || "");
}

function cardFields() {
  const fenced = body.match(/```(?:txt|md)?\s*\n([\s\S]*?)```/i);
  const text = fenced?.[1] || body;
  const fields = {};

  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Z][A-Z ]{1,24}):\s*(.+)$/);
    if (match) fields[match[1].trim().toLowerCase()] = match[2].trim();
  }

  return fields;
}

function firstUrl(value) {
  const match = String(value || "").match(/https?:\/\/[^\s)]+/i);
  return match?.[0] || "";
}

function slug(value) {
  return String(value || "signal")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64) || "signal";
}

function isPlaceholder(value, patterns) {
  const text = String(value || "").trim();
  return !text || patterns.some((pattern) => pattern.test(text));
}

function readProofData() {
  return JSON.parse(fs.readFileSync(proofDataPath, "utf8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function renderProofWall(data) {
  const entries = Array.isArray(data.entries) ? data.entries : [];
  const slots = Array.isArray(data.openSlots) ? data.openSlots : [];
  const lines = [
    "# Proof Wall",
    "",
    "<!-- HUMAN NOTE: Do not fake momentum. Add entries only when there is a real place, real proof, and enough context for another person to check it. -->",
    "",
    "The proof wall is the return path for Drop 001.",
    "",
    "The public page renders from [../site/proof/proof-data.json](../site/proof/proof-data.json).",
    "",
    "Every entry needs:",
    "",
    "- place",
    "- type",
    "- proof",
    "- missing piece",
    "- one public line",
    "- source or field context",
    "- status",
    "",
    "## Entries",
    ""
  ];

  if (entries.length === 0) {
    lines.push("No public proof entries yet.", "");
  } else {
    for (const entry of entries) {
      lines.push(`### ${entry.date || "Undated"} / ${entry.place || "Place held"} / ${entry.type || "Signal"}`);
      lines.push("");
      lines.push(`- Proof: ${entry.proofUrl || entry.proof || "Held for review"}`);
      lines.push(`- Missing piece: ${entry.missingPiece || entry.break || "Held for review"}`);
      lines.push(`- Public line: ${entry.line || "Held for review"}`);
      lines.push(`- Field context: ${entry.sourceIssue || "Held for review"}`);
      lines.push(`- Status: ${entry.status || "published"}`);
      lines.push("");
    }
  }

  lines.push("## Queue", "");

  if (slots.length === 0) {
    lines.push("No open slots.", "");
  } else {
    for (const slot of slots) {
      lines.push(`- ${slot.type || slot.slot || "Signal"}: ${slot.line || "Bring one back."}`);
    }
    lines.push("");
  }

  lines.push("## Wall Rule", "");
  lines.push("If it cannot be checked, it does not go on the wall.", "");
  lines.push("If it looks good but the place is fake, cut it.", "");
  lines.push("If it is real but weak, sharpen it.", "");

  return `${lines.join("\n")}\n`;
}

const card = cardFields();
const issueNumber = Number(issue.number);
const issueUrl = issue.html_url || "";
const type = clean(section("Type") || card.type || issue.title?.replace(/^\[Field\]\s*/i, "").split(":")[0] || "Signal");
const place = clean(section("Place") || card.place);
const missingPiece = clean(section("What Is Missing") || card.break);
const line = clean(section("Line") || card.line);
const proof = clean(section("Proof") || card.proof);
const sourceText = clean(section("Source") || card.source);
const proofUrl = firstUrl(proof);

const missing = [];
if (!issueNumber) missing.push("issue number");
if (isPlaceholder(place, [/^\[?place\]?$/i, /^name the street/i])) missing.push("place");
if (isPlaceholder(missingPiece, [/^\[?break\]?$/i, /^what should the city do here/i])) missing.push("missing piece");
if (isPlaceholder(line, [/^\[?line\]?$/i, /^write the public line/i, /example:\s*\[place\]/i])) missing.push("public line");
if (isPlaceholder(proof, [/^\[?photo \/ post \/ note\]?$/i, /^add a photo/i, /^no proof link supplied/i]) && !proofUrl) missing.push("proof");

if (missing.length > 0) {
  console.error(`Cannot publish proof entry. Missing: ${missing.join(", ")}.`);
  process.exit(1);
}

const data = readProofData();
const createdDate = String(issue.created_at || new Date().toISOString()).slice(0, 10);
const entry = {
  id: `issue-${issueNumber}-${slug(place)}`,
  date: createdDate,
  type,
  place,
  line,
  missingPiece,
  proof,
  proofUrl,
  sourceIssue: issueUrl,
  status: "published"
};

const entries = Array.isArray(data.entries) ? data.entries : [];
const index = entries.findIndex((item) => item.id === entry.id || item.sourceIssue === issueUrl);

if (index >= 0) {
  entries[index] = { ...entries[index], ...entry };
} else {
  entries.unshift(entry);
}

data.updated = new Date().toISOString().slice(0, 10);
data.entries = entries;

writeJson(proofDataPath, data);
fs.writeFileSync(proofWallPath, renderProofWall(data));
writeJson(resultPath, {
  issueNumber,
  entryId: entry.id,
  place: entry.place,
  type: entry.type
});

console.log(`Published ${entry.id} from issue #${issueNumber}.`);
