const assert=require('node:assert/strict');
(async()=>{
  const saved={...process.env}, originalFetch=global.fetch, originalLog=console.log;
  try {
    Object.assign(process.env,{CLOUDFLARE_API_TOKEN:'fixture',CLOUDFLARE_ACCOUNT_ID:'a'.repeat(32),FIELD_REVIEW_TOKEN:'x'.repeat(40),GH_OPERATIONS_TOKEN:'fixture',CLEANUP_TEST:'false',GITHUB_ACTIONS:''});
    for(const pending of [0,2]) {
      let created=0; const output=[]; console.log=value=>output.push(String(value));
      global.fetch=async(url,options={})=>{
        if(url.endsWith('/admin/summary'))return Response.json({summary:{candidates:pending,quarantine:0,oldestPendingAt:pending?'2026-09-26T00:00:00Z':null}});
        if(url.endsWith('/admin/health'))return Response.json({lastRetentionAt:new Date().toISOString(),overdueRecords:0});
        if(url.includes('/d1/database/'))return Response.json({success:true,result:[{results:[{technical_tests:0,quarantined_tests:0,published_or_inflight_tests:0}]}]});
        if(url.includes('/issues?'))return Response.json([]);
        if(url.endsWith('/issues')&&options.method==='POST'){
          const body=JSON.parse(options.body);assert.ok(body.title.startsWith('[Operations]'));
          assert.ok(body.body.includes('Candidates: 2'));assert.ok(!body.body.includes('fixture'));
          created++;return Response.json({html_url:'https://github.com/fixture/operations/1'});
        }
        throw Error('Unexpected outbound request');
      };
      await import('./inspect-private-intake.mjs?case='+pending);
      assert.equal(created,pending?1:0,'healthy empty queue must not create fake activity');
      assert.ok(!output.join('\n').includes('x'.repeat(40)),'credential must not be logged');
    }
  } finally { global.fetch=originalFetch;console.log=originalLog;for(const key of Object.keys(process.env))if(!(key in saved))delete process.env[key];Object.assign(process.env,saved); }
  console.log('Counts-only monitor rehearsal passed; no real notification or report created.');
})().catch(e=>{console.error(e);process.exitCode=1});
