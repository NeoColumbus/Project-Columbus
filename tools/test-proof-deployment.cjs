const assert = require('node:assert/strict');
const deploy = require('./deploy-proof-and-verify.cjs');
(async()=>{
  const expected={id:'fixture',status:'published',checkedBy:'fixture',checkedAt:'2026-09-26'};
  let dispatched=0, tick=10000;
  const make = conclusion=>({rest:{actions:{createWorkflowDispatch:async()=>{dispatched++},listWorkflowRuns:async()=>({data:{workflow_runs:[{head_sha:'abc',created_at:new Date(10000).toISOString(),status:'completed',conclusion}]}})}}});
  const common={owner:'fixture',repo:'fixture',sha:'abc',result:{entryId:'fixture'},expected,now:()=>tick,sleep:async ms=>{tick+=ms}};
  await deploy({...common,github:make('success'),fetchImpl:async()=>Response.json({entries:[expected]})});
  assert.equal(dispatched,1);
  await assert.rejects(deploy({...common,github:make('failure'),fetchImpl:()=>{throw Error('must not fetch')}}),/deployment failed/);
  tick=10000;
  await assert.rejects(deploy({...common,github:make('success'),fetchImpl:async()=>Response.json({entries:[{...expected,checkedBy:'changed'}]})}),/does not match/);
  tick=10000;
  const absent={rest:{actions:{createWorkflowDispatch:async()=>{},listWorkflowRuns:async()=>({data:{workflow_runs:[]}})}}};
  await assert.rejects(deploy({...common,github:absent}),/unconfirmed/);
  console.log('Proof deploy rehearsal passed: verified artifact, failed deploy, mismatched ledger and timeout. No real proof published.');
})().catch(e=>{console.error(e);process.exitCode=1});
