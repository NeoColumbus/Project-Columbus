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
  if (!response.ok) throw new Error('Private summary unavailable.');
  const { summary } = await response.json();
  console.log(JSON.stringify({ candidates: summary.candidates, quarantine: summary.quarantine, oldestPendingAt: summary.oldestPendingAt }));
  const healthResponse = await fetch('https://full-city-field-submission.neocolumbus.workers.dev/admin/health', {
    headers: { authorization: `Bearer ${review}` }, redirect:'error', signal:AbortSignal.timeout(30000)
  });
  if (!healthResponse.ok) throw new Error('Retention health unavailable.');
  const health = await healthResponse.json();
  console.log(JSON.stringify({ lastRetentionAt:health.lastRetentionAt, overdueRecords:health.overdueRecords }));
  if (process.env.GH_OPERATIONS_TOKEN && process.env.CLEANUP_TEST !== 'true') {
    const last = Date.parse(health.lastRetentionAt);
    const retention = Number.isFinite(last) && Date.now()-last < 36*3600000 ? 'heartbeat current' : 'heartbeat missing or overdue';
    const attention = summary.candidates + summary.quarantine > 0 || retention !== 'heartbeat current';
    const body = `Private intake operations only; not field participation or proof.\n\nCandidates: ${summary.candidates}\nQuarantine: ${summary.quarantine}\nOldest pending: ${summary.oldestPendingAt || 'none'}\nRetention: ${retention}\nRecords past retention cutoff: ${health.overdueRecords}\n\nReview privately. No report contents are included here.`;
    const gh = async (path, method='GET', data) => {
      const r=await fetch('https://api.github.com/repos/NeoColumbus/Project-Columbus'+path,{method,headers:{authorization:`Bearer ${process.env.GH_OPERATIONS_TOKEN}`,accept:'application/vnd.github+json','content-type':'application/json'},body:data?JSON.stringify(data):undefined,redirect:'error',signal:AbortSignal.timeout(15000)});
      if(!r.ok) throw new Error(`Operations notification failed: HTTP ${r.status}.`);
      return r.json();
    };
    const title='[Operations] Private intake review queue';
    const issues=await gh('/issues?state=all&creator=github-actions%5Bbot%5D&per_page=100');
    const issue=issues.find(item=>item.title===title && !item.pull_request);
    if (!issue && attention) {
      const created=await gh('/issues','POST',{title,body});
      console.log(`Counts-only operations notice: ${created.html_url}`);
    } else if (issue && (issue.body !== body || issue.state !== (attention?'open':'closed'))) {
      await gh('/issues/'+issue.number,'PATCH',{body,state:attention?'open':'closed'});
      if (attention && (issue.state==='closed' || Date.now()-Date.parse(issue.updated_at)>24*3600000)) await gh('/issues/'+issue.number+'/comments','POST',{body});
    }
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
  if (process.env.CLEANUP_TEST === 'true') {
    if (data.result[0].results[0].published_or_inflight_tests !== 0) throw new Error('Test publication state requires manual review; refusing cleanup.');
    const cleaned = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/62baa265-fe05-4ec6-a713-c50353849323/query`, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30000),
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ sql: "DELETE FROM submissions WHERE json_extract(report,'$.source.asset')=? AND json_extract(report,'$.place')=? AND json_extract(report,'$.line')=? AND json_extract(report,'$.kind')='Deployment check' AND status='quarantine' AND issue_url IS NULL AND publication_state='pending'", params: ['deployment-check-2026-09-24', 'Synthetic deployment check - not a real place', 'Synthetic deployment test; remove after private receipt verification.'] })
    });
    const result = await cleaned.json();
    if (!cleaned.ok || !result.success) throw new Error(`Test cleanup failed: HTTP ${cleaned.status}.`);
    console.log(JSON.stringify({ removed_synthetic_records: result.result[0].meta.changes }));
    const after = await fetch('https://full-city-field-submission.neocolumbus.workers.dev/admin/summary', {
      headers: { authorization: `Bearer ${review}` }, redirect: 'error', signal: AbortSignal.timeout(30000)
    });
    if (!after.ok) throw new Error('Cleanup complete but post-cleanup summary unavailable.');
    const { summary } = await after.json();
    console.log(JSON.stringify({ candidates: summary.candidates, quarantine: summary.quarantine, oldestPendingAt: summary.oldestPendingAt }));
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
