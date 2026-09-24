(function () {
  const config = window.FULL_CITY_CONFIG || {};
  if (config.fieldSubmissionEnabled !== true || !config.turnstileSiteKey || !config.fieldSubmissionEndpoint) return;
  document.querySelectorAll('[data-intake-action]').forEach(link => { link.textContent = 'Report a place'; });
  document.querySelectorAll('[data-intake-note]').forEach(note => { note.textContent = 'Private intake is available. Reports begin as leads, screened before publication and checked by a maintainer before proof.'; });
})();
