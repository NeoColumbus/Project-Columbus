const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'full-city-proof-'));
const env = { ...process.env, PROOF_DATA_PATH: path.join(dir, 'proof.json'), PROOF_WALL_PATH: path.join(dir, 'wall.md'), PROOF_RESULT_PATH: path.join(dir, 'result.json'), PROOF_REVIEWER: 'test-maintainer' };
fs.writeFileSync(env.PROOF_DATA_PATH, JSON.stringify({ entries: [], openSlots: [] }));
function publish(proof, reviewer = 'test-maintainer', card = false) {
  const body = card ? `TYPE: Transit\nPLACE: Test stop\nBREAK: Missing shelter\nLINE: The stop is a room.\nPROOF: ${proof}` : `## Place\nTest stop\n## What Is Missing\nMissing shelter\n## Line\nThe stop is a room.\n## Proof\n${proof}`;
  fs.writeFileSync(path.join(dir, 'issue.json'), JSON.stringify({ number: 123, html_url: 'https://example.com/issues/123', body }));
  return spawnSync(process.execPath, [path.join(__dirname, 'publish-proof-from-issue.cjs'), path.join(dir, 'issue.json')], { env: { ...env, PROOF_REVIEWER: reviewer }, encoding: 'utf8' });
}
try {
  for (const proof of ['', 'No proof link supplied.', 'I saw it myself', 'javascript:alert(1)', 'https://', 'https://user:password@example.com']) assert.notEqual(publish(proof).status, 0, proof);
  assert.notEqual(publish('https://example.com/evidence', '').status, 0);
  assert.equal(publish('Document: https://example.com/evidence').status, 0);
  assert.equal(publish('https://example.com/photo.jpg', 'test-maintainer', true).status, 0);
  const data = JSON.parse(fs.readFileSync(env.PROOF_DATA_PATH));
  assert.equal(data.entries.length, 1);
  assert.equal(data.entries[0].status, 'published');
  assert.equal(data.entries[0].checkedBy, 'test-maintainer');
  assert.match(data.entries[0].checkedAt, /^\d{4}-\d{2}-\d{2}$/);
  console.log('proof publication: leads, invalid URLs, missing review rejected; markdown/card proof and idempotency passed');
} finally { fs.rmSync(dir, { recursive: true, force: true }); }
