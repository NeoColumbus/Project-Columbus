export const SCREENING_VERSION = '2026-09-23.1';

export function evidenceUrl(value) {
  if (!value) return '';
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  // No DNS resolution or evidence fetch. Reject literal/local networks conservatively.
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port ||
      !host.includes('.') || host.includes(':') || /^\[|^localhost$|\.(localhost|local|internal|test|invalid)$/.test(host) ||
      /^\d+\.\d+\.\d+\.\d+$/.test(host)) throw new Error('Unsafe evidence URL');
  for (const key of [...url.searchParams.keys()]) if (/^utm_|^(fbclid|gclid|mc_cid|mc_eid)$/i.test(key)) url.searchParams.delete(key);
  return url.href;
}

export function screen(payload) {
  const flags = [];
  const reject = reason => ({ status: 'rejected', flags: [reason], version: SCREENING_VERSION });
  const limits = { kind: 60, place: 180, break: 500, line: 240, proof: 900 };
  const report = {};
  for (const [key, max] of Object.entries(limits)) {
    if (payload[key] != null && typeof payload[key] !== 'string') return reject('invalid-field');
    if ((payload[key] || '').length > max) return reject('field-size');
    report[key] = (payload[key] || '').normalize('NFKC').replace(/\s+/g, ' ').trim();
  }
  if (report.place.length < 3 || report.break.length < 3 || report.line.length < 5) return reject('incomplete');
  report.kind ||= 'Signal';
  report.source = {};
  for (const [key, max] of [['drop', 40], ['asset', 120], ['source', 120]]) {
    const value = payload.source?.[key] || '';
    if (typeof value !== 'string' || value.length > max) return reject('invalid-source');
    report.source[key] = value;
  }
  // Inspect all supplied text, including fields we deliberately do not persist.
  let text = JSON.stringify(payload).normalize('NFKC');
  try { text += '\n' + decodeURIComponent(text); } catch { /* Malformed escapes remain literal. */ }
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u202a-\u202e]/.test(text) || /(?:\\u001b|\\u0000)/i.test(text)) return reject('control-text');
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text) || /(?:\+?1[ .-]?)?\(?\d{3}\)?[ .-]?\d{3}[ .-]?\d{4}\b/.test(text)) return reject('contact-data');
  if (/(github_pat_|gh[pousr]_|sk-[a-z0-9]{16}|AKIA[A-Z0-9]{16}|BEGIN.{0,15}PRIVATE KEY|(?:password|secret|api[_-]?key|access[_-]?token)\s*["'\s]*[:=]|token\s*[:=]\s*[A-Za-z0-9_.-]{20,}|eyJ[A-Za-z0-9_-]+\.eyJ)/i.test(text)) return reject('credential');
  if (/\b(casino|forex|airdrop|seo backlinks?|guest post|loan offer|buy now|promo code|as an ai language model|lorem ipsum)\b/i.test(text) || /(.)\1{30}/.test(text)) return reject('spam');
  if (/\b(kill yourself|i(?:'ll| will) kill|shoot (?:you|them)|you (?:are a |fucking )?(?:idiot|scum)|go die)\b/i.test(text)) return reject('threat-harassment');
  if (/(javascript|data|file|vbscript):|<\/?(?:script|iframe)\b/i.test(text)) return reject('unsafe-content');
  try {
    report.proof = evidenceUrl(report.proof);
    for (const match of text.matchAll(/https?:\/\/[^\s"<>\\]+/gi)) evidenceUrl(match[0]);
  } catch { return reject('unsafe-url'); }
  if (/\b(fraud|corrupt(?:ion)?|steal(?:s|ing)?|stole|theft|poison(?:s|ing)?|abuse[sd]?|discriminat\w*|criminal|deliberately endanger\w*|brib\w*|murder\w*|rapist|pedophile|scam(?:s|mer)?)\b/i.test(text)) flags.push('allegation');
  if (/\b(lives? at|home address|my neighbor|his house|her house|apartment\s*#?\s*\d|ssn|social security|date of birth|born on|doxx?)\b/i.test(text)) flags.push('personal-information');
  if (/\b(Mr\.?|Mrs\.?|Ms\.?|Dr\.?)\s+[A-Z][a-z]+|\b[A-Z][a-z]+\s+[A-Z][a-z]+\s+(?:is|was|has|did|lives)\b/.test([report.place, report.break, report.line].join(' '))) flags.push('possible-person');
  if (/\b(fuck\w*|shit\w*|bitch\w*|asshole\w*)\b/i.test([report.place, report.break, report.line].join(' '))) flags.push('ambiguous-abuse');
  if (!/\b(stop|bus|shelter|bench|crossing|sidewalk|frontage|wall|street|route|park|lighting|light|ramp|transit|water|power|land|neighborhood|building|intersection|public|corridor)\b/i.test(report.break)) flags.push('uncertain-scope');
  return { report, status: flags.length ? 'quarantine' : 'candidate', flags, version: SCREENING_VERSION };
}

export async function classify(result, env) {
  if (result.status !== 'candidate' || env.CLASSIFIER_ENABLED !== 'true') return result;
  try {
    if (!env.CLASSIFIER) throw new Error('Missing service');
    const response = await env.CLASSIFIER.fetch(new Request('https://classifier.internal/classify', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ task: 'Risk screening only; never verify truth or evidence.', report: result.report }),
      signal: AbortSignal.timeout(5000)
    }));
    if (!response.ok) throw new Error('Classifier unavailable');
    const data = await response.json();
    if (!['candidate', 'quarantine', 'reject'].includes(data.status) || !Number.isFinite(data.confidence) || data.confidence < 0.85 || data.confidence > 1) throw new Error('Uncertain classification');
    return { ...result, status: data.status === 'reject' ? 'rejected' : data.status, flags: [...result.flags, 'classifier-' + data.status] };
  } catch { return { ...result, status: 'quarantine', flags: [...result.flags, 'classifier-uncertain'] }; }
}

export async function fingerprint(report) {
  const normalized = ['kind', 'place', 'break', 'line', 'proof'].map(key => report[key].toLowerCase().replace(/\s+/g, ' ').trim());
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(normalized)));
  return [...new Uint8Array(hash)].map(n => n.toString(16).padStart(2, '0')).join('');
}
