import { createHmac } from 'node:crypto';
const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
const account = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
const review = process.env.FIELD_REVIEW_TOKEN || createHmac('sha256', token || '').update('full-city-private-intake/review/v1').digest('hex');
if (process.env.GITHUB_ACTIONS) console.log(`::add-mask::${review}`);
try {
  if (!token || !/^[a-f0-9]{32}$/i.test(account || '')) throw new Error('Cloudflare configuration missing.');
  const start = Date.now();
  const response = await fetch('https://full-city-field-submission.neocolumbus.workers.dev/admin/summary', {
    headers: { authorization: `Bearer ${review}` }, redirect: 'error', signal: AbortSignal.timeout(30000)
  });
  console.log(`Private summary HTTP ${response.status}; ${Date.now() - start}ms`);
  if (response.ok) {
    const { summary } = await response.json();
    console.log(JSON.stringify({ candidates: summary.candidates, quarantine: summary.quarantine, oldestPendingAt: summary.oldestPendingAt }));
  }
  // Fixed aggregate query only: no report bodies, identifiers, evidence URLs or credentials in logs.
  const query = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/62baa265-fe05-4ec6-a713-c50353849323/query`, {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30000),
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ sql: "SELECT COUNT(*) AS technical_tests, COUNT(CASE WHEN status='quarantine' THEN 1 END) AS quarantined_tests, COUNT(CASE WHEN issue_url IS NOT NULL OR publication_state!='pending' THEN 1 END) AS published_or_inflight_tests FROM submissions WHERE json_extract(report,'$.source.asset')=? AND json_extract(report,'$.place')=? AND json_extract(report,'$.line')=?", params: ['deployment-check-2026-09-24', 'Synthetic deployment check - not a real place', 'Synthetic deployment test; remove after private receipt verification.'] })
  });
  const data = await query.json();
  if (!query.ok || !data.success) throw new Error(`D1 diagnostic failed: HTTP ${query.status}.`);
  console.log(JSON.stringify(data.result[0].results[0]));
} catch (error) { console.error(error.message); process.exitCode = 1; }
