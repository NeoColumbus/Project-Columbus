// Keep this URL inert for cached versions of the one-time verification page.
(() => {
  const button = document.querySelector('#send-check');
  if (button) { button.disabled = true; button.textContent = 'Technical test complete'; }
  const status = document.querySelector('#check-status');
  if (status) status.textContent = 'Private receipt verified. Use the normal signal form for real reports.';
})();
