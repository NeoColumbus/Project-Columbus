import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { readFile } from 'node:fs/promises';

const endpoint = new URL(process.env.FIELD_REVIEW_URL || 'https://full-city-field-submission.neocolumbus.workers.dev/admin/review');
if (endpoint.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(endpoint.hostname)) throw new Error('HTTPS required.');
if (!process.env.FIELD_REVIEW_TOKEN) throw new Error('Set FIELD_REVIEW_TOKEN in your shell; do not put it in command arguments.');
const args = process.argv.slice(2);
if (args.includes('--summary')) endpoint.pathname = '/admin/summary';
const state = args.find(arg => arg.startsWith('--state='))?.split('=')[1] || 'candidate';
endpoint.searchParams.set('state', state);
async function request(body, target = endpoint) {
  const response = await fetch(target, { method: body ? 'POST' : 'GET', redirect: 'error', headers: { authorization: `Bearer ${process.env.FIELD_REVIEW_TOKEN}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error(`Review request failed (${response.status}).`);
  return response.json();
}
const printable = value => JSON.stringify(value).replace(/[\u007f-\u009f\u202a-\u202e]/g, '');
const correction = args.find(arg => arg.startsWith('--revise='));
if (correction) {
  const target = new URL('/admin/revise', endpoint);
  const body = JSON.parse(await readFile(correction.slice('--revise='.length), 'utf8'));
  console.log(printable(await request(body, target)));
  process.exit(0);
}
const data = await request();
if (args.includes('--summary')) { console.log(JSON.stringify(data.summary)); process.exit(0); }
console.log('Attempts in retained window (not people):', printable(data.counts));
for (const item of data.items) console.log(printable({ id: item.id, revision: item.revision, status: item.status, ...item.report, flags: item.flags, duplicateCount: item.duplicate_count, publication: item.publication_state }));
if (!stdin.isTTY || args.includes('--list')) process.exit(0);
const terminal = createInterface({ input: stdin, output: stdout });
try {
  console.log('Actions: revise ID, or approve / reject / quarantine / publish followed by IDs; skip or q exits. Approve is NOT proof. Publish creates a public LEAD.');
  for (;;) {
    const [action, ...ids] = (await terminal.question('review> ')).trim().split(/\s+/);
    if (['q','skip',''].includes(action)) break;
    if (action === 'revise' && ids.length === 1) {
      const latest = await request();
      const item = latest.items.find(record => record.id === ids[0]);
      if (!item) { console.log('Record not in this queue; reopen the appropriate state.'); continue; }
      const report = { ...item.report };
      for (const key of ['kind','place','break','line','proof']) {
        const answer = await terminal.question(`${key} [${printable(report[key])}] (blank keeps, - clears): `);
        if (answer) report[key] = answer === '-' ? '' : answer;
      }
      const reason = await terminal.question('Reason for correction (10+ characters): ');
      console.log(printable(await request({id:item.id,revision:item.revision,reason,report},new URL('/admin/revise',endpoint))));
      continue;
    }
    if (!['approve','reject','quarantine','publish'].includes(action) || !ids.length) continue;
    if (action === 'publish' && await terminal.question('Publish these screened LEADS publicly? Type publish: ') !== 'publish') continue;
    console.log(printable(await request({ action, ids })));
  }
} finally { terminal.close(); }
