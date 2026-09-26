import { json, readPayload } from './worker.mjs';
import { screen, classify, fingerprint } from './screening.mjs';

async function authorized(request, env) {
  if (!env.REVIEW_TOKEN || env.REVIEW_TOKEN.length < 32 || request.headers.has('origin')) return false;
  const hash = value => crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  const a = new Uint8Array(await hash(request.headers.get('authorization') || ''));
  const b = new Uint8Array(await hash('Bearer ' + env.REVIEW_TOKEN));
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}

export async function reviewRequest(request, env) {
  if (!(await authorized(request, env))) return json({ ok: false, error: 'Unauthorized.' }, 401);
  if (!env.DB) return json({ ok: false, error: 'Review unavailable.' }, 503);
  const url = new URL(request.url);
  if (request.method === 'GET' && url.pathname === '/admin/health') {
    const retention = await env.DB.prepare("SELECT last_success FROM operation_health WHERE name='retention'").first();
    const overdue = await env.DB.prepare('SELECT COUNT(*) AS count FROM submissions WHERE created_at < ?').bind(new Date(Date.now() - 30 * 86400000).toISOString()).first();
    return json({ ok: true, lastRetentionAt: retention?.last_success || null, overdueRecords: overdue.count });
  }
  if (request.method === 'POST' && url.pathname === '/admin/revise') return revise(request, env);
  if (request.method === 'GET' && url.pathname === '/admin/audit') {
    const id = url.searchParams.get('id') || '';
    if (!/^[a-f0-9-]{36}$/.test(id)) return json({ ok:false },400);
    const audit = await env.DB.prepare('SELECT * FROM review_audit WHERE submission_id=? ORDER BY revision,created_at').bind(id).all();
    return json({ ok:true, items:audit.results });
  }
  if (request.method === 'GET' && url.pathname === '/admin/summary') {
    const summary = await env.DB.prepare("SELECT COUNT(CASE WHEN status='candidate' THEN 1 END) AS candidates, COUNT(CASE WHEN status='quarantine' THEN 1 END) AS quarantine, MIN(CASE WHEN status IN ('candidate','quarantine') THEN created_at END) AS oldestPendingAt FROM submissions").first();
    return json({ ok: true, summary });
  }
  if (request.method === 'GET' && url.pathname === '/admin/review') {
    const state = url.searchParams.get('state') || 'candidate';
    if (!['candidate', 'quarantine', 'approved', 'published'].includes(state)) return json({ ok: false }, 400);
    const rows = await env.DB.prepare('SELECT * FROM submissions WHERE status=? ORDER BY created_at,id LIMIT 100').bind(state).all();
    const counts = await env.DB.prepare('SELECT outcome,SUM(count) AS count FROM intake_counts GROUP BY outcome').all();
    return json({ ok: true, items: rows.results.map(row => ({ ...row, report: JSON.parse(row.report), flags: JSON.parse(row.flags), fingerprint: undefined })), counts: counts.results });
  }
  if (request.method !== 'POST' || url.pathname !== '/admin/review') return json({ ok: false }, 404);
  const body = await readPayload(request);
  if (!Array.isArray(body.ids) || !body.ids.length || body.ids.length > 50 || !body.ids.every(id => typeof id === 'string' && /^[a-f0-9-]{36}$/.test(id)) || !['approve', 'reject', 'quarantine', 'publish'].includes(body.action)) return json({ ok: false }, 400);
  const results = [];
  for (const id of [...new Set(body.ids)]) {
    if (body.action === 'publish') { results.push(await publish(id, env)); continue; }
    const row = await env.DB.prepare('SELECT status,publication_state FROM submissions WHERE id=?').bind(id).first();
    if (!row || !['candidate', 'quarantine', 'approved'].includes(row.status) || row.publication_state !== 'pending' || (body.action === 'approve' && row.status !== 'candidate')) { results.push({ id, ok: false, error: 'State conflict; quarantine needs a corrected, re-screened submission.' }); continue; }
    const changed = body.action === 'reject'
      ? await env.DB.prepare("DELETE FROM submissions WHERE id=? AND status=? AND publication_state='pending'").bind(id, row.status).run()
      : await env.DB.prepare("UPDATE submissions SET status=?,reviewed_at=?,reviewer=? WHERE id=? AND status=? AND publication_state='pending'").bind(body.action === 'approve' ? 'approved' : 'quarantine', new Date().toISOString(), env.REVIEWER_ID || 'maintainer', id, row.status).run();
    results.push({ id, ok: changed.meta.changes === 1 });
  }
  return json({ ok: true, results });
}

async function revise(request, env) {
  const body = await readPayload(request);
  if (!/^[a-f0-9-]{36}$/.test(body.id || '') || !Number.isInteger(body.revision) || body.revision < 0 ||
      typeof body.reason !== 'string' || body.reason.trim().length < 10 || body.reason.length > 500 ||
      !body.report || typeof body.report !== 'object' || Array.isArray(body.report)) return json({ ok: false, error: 'Correction requires ID, current revision, full report and a review reason.' }, 400);
  const row = await env.DB.prepare('SELECT * FROM submissions WHERE id=?').bind(body.id).first();
  if (!row || row.revision !== body.revision || !['candidate','quarantine','approved'].includes(row.status) || row.publication_state !== 'pending') return json({ ok: false, error: 'Record changed or publication started. Reload before correcting.' }, 409);
  const original = JSON.parse(row.report);
  const result = await classify(screen({ ...body.report, source: original.source, reviewReason: body.reason }), env);
  if (result.status === 'rejected') return json({ ok: false, error: 'Correction failed screening. Original record unchanged.' }, 422);
  const fp = await fingerprint(result.report);
  const duplicate = await env.DB.prepare('SELECT id FROM submissions WHERE fingerprint=? AND id!=?').bind(fp, row.id).first();
  if (duplicate) return json({ ok: false, error: 'Correction matches another record. Review that record instead.' }, 409);
  const now = new Date().toISOString();
  const results = await env.DB.batch([
    env.DB.prepare("INSERT INTO review_audit(id,submission_id,created_at,reviewer,reason,previous_fingerprint,next_fingerprint,previous_status,next_status,revision) SELECT ?,id,?,?,?,?,?,status,?,revision+1 FROM submissions WHERE id=? AND revision=? AND publication_state='pending' AND status=?")
      .bind(crypto.randomUUID(), now, env.REVIEWER_ID || 'maintainer', body.reason.trim(), row.fingerprint, fp, result.status, row.id, row.revision, row.status),
    env.DB.prepare("UPDATE submissions SET report=?,fingerprint=?,flags=?,status=?,screening_version=?,revision=revision+1,reviewed_at=NULL,reviewer=NULL WHERE id=? AND revision=? AND publication_state='pending' AND status=?")
      .bind(JSON.stringify(result.report), fp, JSON.stringify(result.flags), result.status, result.version, row.id, row.revision, row.status)
  ]);
  if (results[1].meta.changes !== 1) return json({ ok: false, error: 'Record changed. Reload before correcting.' }, 409);
  return json({ ok: true, status: result.status, revision: row.revision + 1, state: 'LEAD', approvalRequired: true });
}

async function publish(id, env) {
  if (!env.GITHUB_TOKEN) return { id, ok: false, error: 'Publishing not configured.' };
  const row = await env.DB.prepare("SELECT * FROM submissions WHERE id=? AND status='approved' AND publication_state='pending'").bind(id).first();
  if (!row) return { id, ok: false, error: 'Not approved or publication already attempted.' };
  const lock = await env.DB.prepare("UPDATE submissions SET publication_state='sending' WHERE id=? AND status='approved' AND publication_state='pending'").bind(id).run();
  if (lock.meta.changes !== 1) return { id, ok: false, error: 'Publication in progress.' };
  const report = JSON.parse(row.report);
  const safe = text => String(text).replace(/@/g, '&#64;').replace(/[<>]/g, c => c === '<' ? '&lt;' : '&gt;');
  const body = [ `<!-- private-intake:${id} -->`, '## State', 'LEAD / screened and approved for public review. Not checked proof.', '## Place', safe(report.place), '## Proof', report.proof || 'No evidence supplied.', '## What Is Missing', safe(report.break), '## Line', safe(report.line), '## Source', safe(JSON.stringify(report.source)), '## Context', `Intake reviewed by ${safe(row.reviewer)} at ${row.reviewed_at}. Duplicate reports: ${row.duplicate_count}; not a count of people.` ].join('\n\n');
  try {
    const response = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO || 'NeoColumbus/Project-Columbus'}/issues`, {
      method: 'POST', headers: { authorization: `Bearer ${env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json', 'content-type': 'application/json', 'user-agent': 'full-city-private-review', 'x-github-api-version': '2022-11-28' },
      body: JSON.stringify({ title: `[LEAD] ${report.kind}: ${report.place}`.slice(0,240), body }), signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error('Publication failed');
    const issue = await response.json();
    if (!Number.isInteger(issue.number)) throw new Error('Invalid publication result');
    const issueUrl = `https://github.com/${env.GITHUB_REPO || 'NeoColumbus/Project-Columbus'}/issues/${issue.number}`;
    await env.DB.prepare("UPDATE submissions SET status='published',publication_state='complete',issue_url=? WHERE id=?").bind(issueUrl,id).run();
    return { id, ok: true, issueUrl, state: 'LEAD' };
  } catch {
    // A timeout may mean GitHub accepted the issue. Never blindly create another.
    await env.DB.prepare("UPDATE submissions SET publication_state='uncertain' WHERE id=?").bind(id).run();
    return { id, ok: false, error: 'Publication uncertain. Reconcile the intake marker on GitHub before any retry.' };
  }
}
