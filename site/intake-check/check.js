(() => {
  const button = document.querySelector('#send-check');
  const status = document.querySelector('#check-status');
  let verification = '';
  let widget;
  window.onIntakeCheckReady = () => {
    widget = window.turnstile.render('#verification', {
      sitekey: '0x4AAAAAAFCgRiz5oxBW7Mh4', action: 'field-report',
      callback: value => { verification = value; button.disabled = false; status.textContent = 'Verification ready. Send the private test when ready.'; },
      'expired-callback': () => { verification = ''; button.disabled = true; status.textContent = 'Verification expired. Refresh this page to try again.'; },
      'error-callback': () => { verification = ''; button.disabled = true; status.textContent = 'Verification unavailable. Refresh this page or report the problem; nothing was sent.'; }
    });
  };
  const script = document.createElement('script');
  script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onIntakeCheckReady&render=explicit';
  script.async = true;
  script.onerror = () => { status.textContent = 'Verification could not load. Nothing was sent.'; };
  document.head.appendChild(script);
  button.addEventListener('click', async () => {
    if (!verification || button.disabled) return;
    button.disabled = true;
    status.textContent = 'Sending technical test...';
    try {
      const response = await fetch('https://full-city-field-submission.neocolumbus.workers.dev/field-report', {
        method: 'POST', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(15000),
        body: JSON.stringify({
          kind: 'Deployment check', place: 'Synthetic deployment check - not a real place',
          break: 'Technical verification only. Not an observation or participation record.',
          line: 'Synthetic deployment test; remove after private receipt verification.', proof: '',
          source: { drop: '', asset: 'deployment-check-2026-09-24', source: 'maintainer-test' },
          website: '', turnstileToken: verification
        })
      });
      const result = await response.json();
      status.textContent = response.status === 202 && result.ok
        ? 'Test received for private screening. Nothing published. Tell Codex "test received" so the private record can be checked and removed.'
        : `Test not confirmed (HTTP ${response.status}). Refresh, verify again, and retry later. Nothing published.`;
    } catch {
      status.textContent = 'Receipt unconfirmed. Refresh and retry later; duplicates are grouped. Tell Codex if this persists.';
    } finally {
      verification = '';
      window.turnstile.reset(widget);
    }
  });
})();
