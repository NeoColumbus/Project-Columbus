const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

(async () => {
  const { default: worker } = await import('../api/field-submission/worker.mjs');
  const { screen, classify, evidenceUrl } = await import('../api/field-submission/screening.mjs');
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys=ON');
  for (const file of fs.readdirSync(path.join(__dirname, '../api/field-submission/migrations')).sort()) sqlite.exec(fs.readFileSync(path.join(__dirname, '../api/field-submission/migrations', file), 'utf8'));
  // Actual SQLite executes the production SQL; this adapter mirrors D1's result shape.
  const DB = { prepare(sql) { const stmt = sqlite.prepare(sql); let args = []; const wrapper = {
    bind(...values) { args = values; return wrapper; },
    runSync() { const result = stmt.run(...args); return { meta: { changes: Number(result.changes) } }; },
    async run() { return wrapper.runSync(); },
    async first() { return stmt.get(...args) || null; },
    async all() { return { results: stmt.all(...args) }; }
  }; return wrapper; }, async batch(statements) { sqlite.exec('BEGIN'); try { const results=statements.map(s=>s.runSync()); sqlite.exec('COMMIT'); return results; } catch(error) { sqlite.exec('ROLLBACK'); throw error; } } };
  const env = { DB, TURNSTILE_SECRET: 'fixture-secret', TURNSTILE_HOSTNAME: 'neocolumbus.github.io', REVIEW_TOKEN: 'fixture-review-token-32-characters-long', GITHUB_TOKEN: 'fixture-github-secret', SUBMISSION_RATE_LIMITER: { limit: async () => ({ success: true }) } };
  const valid = { kind: 'Transit', place: 'Bus stop outside Kroger', break: 'Bus stop has no shelter.', line: 'The stop is a room.', proof: '', source: { drop: '001', asset: '007-transit', source: 'sticker-007' }, turnstileToken: 'fixture' };
  let calls = [], verification = { success: true, hostname: env.TURNSTILE_HOSTNAME, action: 'field-report' }, failGitHub = false;
  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    calls.push(String(url));
    if (String(url).includes('siteverify')) return Response.json(verification);
    if (String(url).startsWith('https://api.github.com/')) {
      if (failGitHub) throw new Error('SECRET provider error');
      const issue = JSON.parse(options.body); assert.ok(issue.body.includes('LEAD')); assert.ok(!issue.body.includes('fixture-secret'));
      return Response.json({ number: 321 }, { status: 201 });
    }
    throw new Error('Unexpected outbound request');
  };
  const post = (body = valid, overrides = {}) => worker.fetch(new Request('https://worker.example/field-report', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://neocolumbus.github.io', 'cf-connecting-ip': '192.0.2.1' }, body: typeof body === 'string' ? body : JSON.stringify(body) }), { ...env, ...overrides });
  const admin = (body, token = env.REVIEW_TOKEN, state = '') => worker.fetch(new Request('https://worker.example/admin/review' + state, { method: body ? 'POST' : 'GET', headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }), env);
  try {
    assert.equal((await post()).status, 202);
    assert.equal(calls.filter(url => url.includes('github')).length, 0, 'intake must never publish');
    assert.equal((await admin(null, 'wrong')).status, 401);
    const first = (await (await admin()).json()).items[0];
    assert.equal(first.status, 'candidate');
    assert.equal(first.report.proof, '', 'leads need no hosted evidence');
    assert.ok(!JSON.stringify(first).includes('192.0.2.1'));
    assert.ok(!JSON.stringify(first).includes('turnstileToken'));
    const burst = await Promise.all(Array.from({ length: 100 }, () => post()));
    assert.ok(burst.every(r => r.status === 202));
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM submissions').get().n, 1);
    assert.equal(sqlite.prepare('SELECT duplicate_count FROM submissions').get().duplicate_count, 100);
    let attempts = 0;
    const limited = { limit: async () => ({ success: ++attempts <= 5 }) };
    const rates = [];
    for (let i = 0; i < 8; i++) rates.push((await post(valid, { SUBMISSION_RATE_LIMITER: limited })).status);
    assert.deepEqual(rates, [202,202,202,202,202,429,429,429]);
    for (const name of ['DB','TURNSTILE_SECRET','TURNSTILE_HOSTNAME','SUBMISSION_RATE_LIMITER']) assert.equal((await post(valid, { [name]: undefined })).status, 503);
    assert.equal((await post('{bad')).status, 400);
    assert.equal((await post('x'.repeat(13000))).status, 400);
    assert.equal((await post([])).status, 400);
    const before = calls.length;
    assert.equal((await post({ website: 'spam' })).status, 202);
    assert.equal(calls.length, before);
    for (const bad of [{ success:false }, { ...verification, hostname:'evil.example' }, { ...verification, action:'login' }]) {
      const saved = verification; verification = bad; assert.equal((await post()).status, 403); verification = saved;
    }
    for (const text of ['Call 614-555-1234', 'Contact user@example.com', 'github_pat_fakefixturevalue', 'password=example', 'I will kill you', 'Buy now promo code', 'javascript:alert(1)']) {
      const res = await post({ ...valid, line: text });
      assert.equal(res.status, 422, text);
      assert.equal((await res.json()).error, 'This submission could not be accepted.');
    }
    for (const url of ['file:///etc/passwd','http://127.0.0.1/x','http://2130706433/x','https://192.168.1.1','https://[::1]','https://user:pass@example.com','https://x.internal/']) assert.throws(() => evidenceUrl(url));
    assert.equal(evidenceUrl('https://example.com/photo?utm_source=test&item=2'), 'https://example.com/photo?item=2');
    assert.equal(screen({ ...valid, break: 'Kroger deliberately endangers disabled riders.' }).status, 'quarantine');
    assert.equal(screen({ ...valid, break: 'My neighbor lives at 12 Sample Street.' }).status, 'quarantine');
    assert.equal(screen({ ...valid, break: 'John Smith is at the bus stop every night.' }).status, 'quarantine');
    assert.equal((await post({ ...valid, break: 'Kroger deliberately endangers disabled riders.' })).status, 202);
    assert.equal((await (await admin()).json()).items.length, 1, 'quarantine excluded by default');
    const summaryRequest = token => worker.fetch(new Request('https://worker.example/admin/summary', { headers: { authorization: 'Bearer ' + token } }), env);
    assert.equal((await summaryRequest('wrong')).status, 401);
    const summary = await (await summaryRequest(env.REVIEW_TOKEN)).json();
    assert.deepEqual(Object.keys(summary.summary).sort(), ['candidates','oldestPendingAt','quarantine']);
    assert.equal(summary.summary.candidates, 1, 'summary counts records, not duplicate attempts');
    assert.equal(summary.summary.quarantine, 1);
    assert.match(summary.summary.oldestPendingAt, /^\d{4}-\d{2}-\d{2}T/);
    assert.ok(!JSON.stringify(summary).includes('Kroger'), 'summary contains no report content');
    const quarantined = (await (await admin(null, env.REVIEW_TOKEN, '?state=quarantine')).json()).items[0];
    assert.equal((await (await admin({ action:'approve', ids:[quarantined.id] })).json()).results[0].ok, false);
    const revise = (body, token=env.REVIEW_TOKEN) => worker.fetch(new Request('https://worker.example/admin/revise', { method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(body) }),env);
    const correction = { id:quarantined.id,revision:0,reason:'Removed unsupported allegation; retained observable condition.',report:{...valid,place:'Bus stop at Main Street',break:'Bus stop has no seating.',source:{source:'cannot-replace-original'}} };
    assert.equal((await revise(correction,'wrong')).status,401);
    assert.equal((await revise({...correction,reason:'short'})).status,400);
    assert.equal((await revise({...correction,report:{...valid,line:'password=example'}})).status,422);
    assert.equal((await revise({...correction,report:valid})).status,409,'cannot collide with another report');
    assert.equal((await revise(correction)).status,200);
    const corrected=sqlite.prepare('SELECT * FROM submissions WHERE id=?').get(quarantined.id);
    assert.equal(corrected.status,'candidate');
    assert.equal(corrected.reviewer,null,'rescreening does not approve');
    assert.equal(corrected.revision,1);
    assert.equal(JSON.parse(corrected.report).source.source,valid.source.source);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM review_audit').get().n,1);
    const audit=await worker.fetch(new Request('https://worker.example/admin/audit?id='+quarantined.id,{headers:{authorization:'Bearer '+env.REVIEW_TOKEN}}),env);
    assert.equal((await audit.json()).items[0].reason,correction.reason);
    assert.equal((await revise(correction)).status,409,'stale edits rejected');
    assert.equal(calls.filter(url=>url.includes('github')).length,0,'correction stays private');
    await admin({action:'reject',ids:[quarantined.id]});
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM review_audit').get().n,0,'audit expires with private record');
    const candidate = screen(valid);
    const low = await classify(candidate, { CLASSIFIER_ENABLED:'true', CLASSIFIER: { fetch: async () => Response.json({ status:'candidate', confidence:0.4 }) } });
    assert.equal(low.status, 'quarantine');
    const elevated = await classify(candidate, { CLASSIFIER_ENABLED:'true', CLASSIFIER: { fetch: async () => Response.json({ status:'reject', confidence:0.99 }) } });
    assert.equal(elevated.status, 'rejected');
    const quarantine = screen({ ...valid, break:'Fraud at this bus stop.' });
    assert.equal((await classify(quarantine, { CLASSIFIER_ENABLED:'true', CLASSIFIER: { fetch: () => { throw new Error('must not run'); } } })).status, 'quarantine');
    assert.equal((await (await admin({ action:'publish', ids:[first.id] })).json()).results[0].ok, false);
    assert.equal((await (await admin({ action:'approve', ids:[first.id] })).json()).results[0].ok, true);
    assert.equal(calls.filter(url => url.includes('github')).length, 0, 'approval alone is private');
    const publications = await Promise.all([admin({ action:'publish', ids:[first.id] }), admin({ action:'publish', ids:[first.id] })]);
    assert.equal(calls.filter(url => url.includes('github')).length, 1, 'concurrent publication is once only');
    assert.equal(sqlite.prepare('SELECT status FROM submissions WHERE id=?').get(first.id).status, 'published');
    await post({ ...valid, place:'Broad and High bus stop' });
    const second = (await (await admin()).json()).items[0];
    await admin({ action:'approve', ids:[second.id] });
    failGitHub = true;
    const failed = await (await admin({ action:'publish', ids:[second.id] })).json();
    assert.ok(!JSON.stringify(failed).includes('SECRET'));
    assert.equal(sqlite.prepare('SELECT publication_state FROM submissions WHERE id=?').get(second.id).publication_state, 'uncertain');
    const previous = calls.length; await admin({ action:'publish', ids:[second.id] }); assert.equal(calls.length, previous);
    const unavailable = await post(valid, { DB: { prepare() { throw new Error('fixture-secret'); } } });
    assert.equal(unavailable.status, 503); assert.ok(!(await unavailable.text()).includes('fixture-secret'));
    sqlite.exec("UPDATE submissions SET created_at='2020-01-01T00:00:00Z'");
    await worker.scheduled({}, env);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM submissions').get().n, 0);
    const health=await worker.fetch(new Request('https://worker.example/admin/health',{headers:{authorization:'Bearer '+env.REVIEW_TOKEN}}),env);
    const healthData=await health.json();
    assert.equal(healthData.overdueRecords,0);
    assert.ok(healthData.lastRetentionAt);
    assert.equal((await worker.fetch(new Request('https://worker.example/admin/health'),env)).status,401);
    console.log('Private intake pressure checks passed: SQL, 100 concurrent duplicates, rate limit, verification, screening, private review, once-only LEAD publication, retention. External services mocked; not production verification.');
  } finally { global.fetch = originalFetch; sqlite.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
