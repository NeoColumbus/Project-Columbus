import { writeFile, appendFile, unlink } from 'node:fs/promises';
import { createHmac } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
const account = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
const config = 'api/field-submission/.provisioned.json';
const worker = 'full-city-field-submission';
const endpoint = `https://${worker}.neocolumbus.workers.dev`;
const name = 'full-city-private-intake';
function mask(value) { if (process.env.GITHUB_ACTIONS) console.log(`::add-mask::${value}`); }
async function api(path, method = 'GET', body) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}${path}`, {
    method, redirect: 'error', signal: AbortSignal.timeout(30000),
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(`Cloudflare ${method} ${path.split('?')[0]} failed (HTTP ${response.status}; codes ${(data.errors || []).map(e => e.code).join(',')}). Check token scope and account ID.`);
  return data.result;
}
function wrangler(args, input) {
  const result = spawnSync('pnpm', ['exec', 'wrangler', ...args, '--config', config], {
    encoding: 'utf8', input, stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false' }
  });
  // Never forward provider bodies or secret-upload output to public logs.
  if (result.status !== 0) throw new Error(`Wrangler ${args.slice(0, 3).join(' ')} failed (exit ${result.status}). Inspect account permissions/configuration privately.`);
  console.log(`Wrangler ${args.slice(0, 3).join(' ')} succeeded.`);
}
async function probe(path, expected, options = {}) {
  // Read-only probes may reach an old deployment while secret versions propagate.
  const attempts = expected === 200 && path.startsWith('/admin/') ? 6 : 1;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const response = await fetch(endpoint + path, { ...options, redirect: 'error', signal: AbortSignal.timeout(15000) });
    if (response.status === expected) return response.json();
    if (attempt === attempts - 1 || ![401, 503].includes(response.status)) throw new Error(`Production ${path}: expected ${expected}, received ${response.status}.`);
    await response.arrayBuffer();
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}
try {
  if (!token || !/^[a-f0-9]{32}$/i.test(account || '')) throw new Error('Configure a Cloudflare API token and 32-character account ID in Actions secrets.');
  mask(token);
  const databases = await api(`/d1/database?name=${name}&per_page=100`);
  let db = databases.find(item => item.name === name);
  if (!db) db = await api('/d1/database', 'POST', { name });
  if (!db.uuid) throw new Error('Database API did not return an ID.');
  console.log('Private D1 database available.');
  const widgets = await api('/challenges/widgets?per_page=100');
  let widget = widgets.find(item => item.name === 'Full City private intake');
  if (widget) widget = await api(`/challenges/widgets/${widget.sitekey}`);
  else widget = await api('/challenges/widgets', 'POST', { name: 'Full City private intake', domains: ['neocolumbus.github.io'], mode: 'managed' });
  if (!widget.secret || widget.mode !== 'managed' || widget.domains.length !== 1 || widget.domains[0] !== 'neocolumbus.github.io') throw new Error('Existing widget configuration requires private review; refusing to alter it automatically.');
  mask(widget.secret);
  console.log(`Public configuration: database_id=${db.uuid}; turnstile_site_key=${widget.sitekey}`);
  // Stable across runs; a dedicated secret can decouple review access from token rotation.
  const review = process.env.FIELD_REVIEW_TOKEN || createHmac('sha256', token).update('full-city-private-intake/review/v1').digest('hex');
  if (review.length < 32) throw new Error('FIELD_REVIEW_TOKEN must contain at least 32 characters.');
  mask(review);
  await writeFile(config, JSON.stringify({
    name: worker, main: 'worker.mjs', compatibility_date: '2026-09-23', workers_dev: true,
    d1_databases: [{ binding: 'DB', database_name: name, database_id: db.uuid, migrations_dir: 'migrations' }],
    triggers: { crons: ['17 4 * * *'] },
    ratelimits: [{ name: 'SUBMISSION_RATE_LIMITER', namespace_id: '1001', simple: { limit: 5, period: 60 } }],
    vars: { GITHUB_REPO: 'NeoColumbus/Project-Columbus', TURNSTILE_HOSTNAME: 'neocolumbus.github.io', CLASSIFIER_ENABLED: 'false', REVIEWER_ID: 'Full City maintainer', ALLOWED_ORIGINS: 'https://neocolumbus.github.io' }
  }));
  wrangler(['d1', 'migrations', 'apply', name, '--remote']);
  wrangler(['deploy']);
  wrangler(['secret', 'bulk'], JSON.stringify({ TURNSTILE_SECRET: widget.secret, REVIEW_TOKEN: review }));
  await new Promise(resolve => setTimeout(resolve, 10000));
  await probe('/admin/review', 401);
  await probe('/admin/summary', 401);
  const summary = await probe('/admin/summary', 200, { headers: { authorization: `Bearer ${review}` } });
  if (!summary.ok || !summary.summary) throw new Error('Private summary unavailable.');
  const post = body => ({ method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://neocolumbus.github.io' }, body });
  await probe('/field-report', 400, post('{'));
  await probe('/field-report', 400, post(JSON.stringify({ line: 'x'.repeat(13000) })));
  await probe('/field-report', 403, post(JSON.stringify({ turnstileToken: 'invalid-production-probe' })));
  await probe('/field-report', 403, post('{}'));
  await probe('/field-report', 403, post('{}'));
  // Cloudflare counters are approximate and per edge, not a globally exact sixth-request gate.
  let limited = false;
  for (let attempt = 0; attempt < 20 && !limited; attempt++) {
    const response = await fetch(endpoint + '/field-report', { ...post('{}'), signal: AbortSignal.timeout(15000), redirect: 'error' });
    if (![403, 429].includes(response.status)) throw new Error(`Rate-limit probe returned unexpected HTTP ${response.status}.`);
    limited = response.status === 429;
    await response.arrayBuffer();
  }
  if (!limited) throw new Error('No production rate-limit rejection observed within the bounded probe.');
  const after = await probe('/admin/summary', 200, { headers: { authorization: `Bearer ${review}` } });
  if (JSON.stringify(after.summary) !== JSON.stringify(summary.summary)) throw new Error('Queue changed during negative probes; investigate privately.');
  console.log('Production negative probes passed. No valid report or public issue submitted.');
  const report = `## Private intake deployment\n\n- D1 database: ${db.uuid}\n- Public Turnstile site key: ${widget.sitekey}\n- Private Worker, retention schedule and rate-limit binding deployed.\n- Unauthorized review, malformed/oversized requests, invalid verification and rate limit probes passed.\n- Queue unchanged by probes.\n- Website stays disabled until a real browser verification and private receipt test pass.\n- Review credential uses FIELD_REVIEW_TOKEN when supplied; otherwise a domain-separated HMAC of the deployment token. It is never printed.\n`;
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, report);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally { await unlink(config).catch(() => {}); }
