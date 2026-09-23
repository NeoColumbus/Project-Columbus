import { screen, classify, fingerprint } from './screening.mjs';
import { reviewRequest } from './review.mjs';

export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
}

export async function readPayload(request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new Error('Invalid body');
  if (Number(request.headers.get('content-length')) > 12000) throw new Error('Invalid body');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Invalid body');
  const chunks = []; let length = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 12000) { await reader.cancel(); throw new Error('Invalid body'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const payload = JSON.parse(new TextDecoder().decode(bytes));
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Invalid body');
  return payload;
}

async function count(db, outcome) {
  await db.prepare('INSERT INTO intake_counts(day,outcome,count) VALUES(?,?,1) ON CONFLICT(day,outcome) DO UPDATE SET count=count+1').bind(new Date().toISOString().slice(0,10), outcome).run();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/admin/')) {
      try { return await reviewRequest(request, env); }
      catch { return json({ ok: false, error: 'Review unavailable.' }, 503); }
    }
    const origin = request.headers.get('origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || 'https://neocolumbus.github.io').split(',').map(s => s.trim());
    const cors = { 'vary': 'Origin', 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type' };
    if (allowed.includes(origin)) cors['access-control-allow-origin'] = origin;
    if (origin && !allowed.includes(origin)) return json({ ok: false, error: 'Origin not allowed.' }, 403, cors);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST' || !['/', '/field-report'].includes(url.pathname)) return json({ ok: false, error: 'Not found.' }, 404, cors);
    try {
      if (!env.DB || !env.TURNSTILE_SECRET || !env.TURNSTILE_HOSTNAME || !env.SUBMISSION_RATE_LIMITER) return json({ ok: false, error: 'Private inbox is not available. Save your card and try later.' }, 503, cors);
      const { success } = await env.SUBMISSION_RATE_LIMITER.limit({ key: request.headers.get('cf-connecting-ip') || 'unknown-client' });
      if (!success) return json({ ok: false, error: 'Try again in a minute.' }, 429, { ...cors, 'retry-after': '60' });
      let payload;
      try { payload = await readPayload(request); } catch { return json({ ok: false, error: 'Invalid submission.' }, 400, cors); }
      if (payload.website) return json({ ok: true, state: 'LEAD', queued: true }, 202, cors);
      if (typeof payload.turnstileToken !== 'string' || !payload.turnstileToken || payload.turnstileToken.length > 2048) return json({ ok: false, error: 'Verification failed.' }, 403, cors);
      const verification = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST', body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: payload.turnstileToken }), signal: AbortSignal.timeout(8000)
      });
      if (!verification.ok) throw new Error('Verification unavailable');
      const verified = await verification.json();
      if (verified.success !== true || verified.hostname !== env.TURNSTILE_HOSTNAME || verified.action !== 'field-report') return json({ ok: false, error: 'Verification failed.' }, 403, cors);
      const { turnstileToken, website, ...input } = payload;
      const result = await classify(screen(input), env);
      if (result.status === 'rejected') {
        await count(env.DB, 'rejected');
        return json({ ok: false, error: 'This submission could not be accepted.' }, 422, cors);
      }
      const fp = await fingerprint(result.report);
      // A single UPSERT arbitrates simultaneous duplicates. Retain at most 30 days.
      await env.DB.prepare("INSERT INTO submissions(id,created_at,fingerprint,report,status,flags,screening_version) VALUES(?,?,?,?,?,?,?) ON CONFLICT(fingerprint) DO UPDATE SET duplicate_count=duplicate_count+1, status=CASE WHEN excluded.status='quarantine' AND submissions.status='candidate' THEN 'quarantine' ELSE submissions.status END, flags=CASE WHEN excluded.status='quarantine' AND submissions.status='candidate' THEN excluded.flags ELSE submissions.flags END").bind(crypto.randomUUID(), new Date().toISOString(), fp, JSON.stringify(result.report), result.status, JSON.stringify(result.flags), result.version).run();
      await count(env.DB, result.status);
      return json({ ok: true, state: 'LEAD', queued: true }, 202, cors);
    } catch { return json({ ok: false, error: 'Private inbox temporarily unavailable. Save your card and try later.' }, 503, cors); }
  },
  async scheduled(event, env) {
    if (!env.DB) return;
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
    await env.DB.batch([
      env.DB.prepare('DELETE FROM submissions WHERE created_at < ?').bind(cutoff),
      env.DB.prepare('DELETE FROM intake_counts WHERE day < ?').bind(cutoff.slice(0,10))
    ]);
  }
};
