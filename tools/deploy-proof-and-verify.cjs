module.exports = async function deployProof({ github, owner, repo, sha, result, expected, fetchImpl = fetch, sleep = ms => new Promise(r => setTimeout(r,ms)), now = () => Date.now() }) {
  const started = now();
  await github.rest.actions.createWorkflowDispatch({ owner, repo, workflow_id:'deploy-pages.yml', ref:'main' });
  let deployed = false;
  while (now() - started < 15 * 60000) {
    const { data } = await github.rest.actions.listWorkflowRuns({ owner, repo, workflow_id:'deploy-pages.yml', event:'workflow_dispatch', head_sha:sha, per_page:20 });
    const run = data.workflow_runs.find(r => r.head_sha === sha && Date.parse(r.created_at) >= started - 5000);
    if (run?.status === 'completed') {
      if (run.conclusion !== 'success') throw new Error(`Pages deployment failed (${run.conclusion}); do not mark proof published.`);
      deployed = true; break;
    }
    await sleep(15000);
  }
  if (!deployed) throw new Error('Pages deployment unconfirmed; do not mark proof published.');
  for (let attempt=0;attempt<8;attempt++) {
    const response = await fetchImpl(`https://neocolumbus.github.io/Project-Columbus/site/proof/proof-data.json?verify=${sha}`, { cache:'no-store', signal:AbortSignal.timeout(15000) });
    if (response.ok) {
      const entry = (await response.json()).entries?.find(item=>item.id===result.entryId);
      if (entry && JSON.stringify(entry) === JSON.stringify(expected)) return;
    }
    await sleep(10000);
  }
  throw new Error('Live ledger does not match reviewed record; do not mark proof published.');
};
