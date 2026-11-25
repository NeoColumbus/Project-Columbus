(function () {
  const places = document.querySelectorAll('[data-place-key]');
  if (!places.length) return;
  const chapters = [...document.querySelectorAll('.chapter-band')];
  const chapterLinks = [...document.querySelectorAll('.publication-index a')];
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(() => {
      const current = chapters.filter(chapter => chapter.getBoundingClientRect().top <= innerHeight / 2).pop();
      for (const link of chapterLinks) {
        if (current && link.hash === '#' + current.id) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      }
    }, {rootMargin:'0px 0px -50% 0px'});
    chapters.forEach(chapter => observer.observe(chapter));
  }
  const categories = {
    Corridors: ['morse-road', 'parsons-avenue'],
    Neighborhoods: ['franklinton', 'linden', 'the-hilltop'],
    'Civic nodes': ['broad-and-high', 'mound-and-high']
  };
  const filters = document.querySelector('.atlas-filters');
  if (filters) {
    filters.hidden = false;
    function revealCrossing() {
      if (['#place-broad-high', '#place-mound-high'].includes(location.hash)) {
        filters.querySelector('button').click();
        document.getElementById(location.hash.slice(1)).scrollIntoView();
      }
    }
    window.addEventListener('hashchange', revealCrossing);
    document.querySelector('.atlas-crossings')?.addEventListener('click', () => filters.querySelector('button').click());
    filters.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button) return;
      for (const choice of filters.children) choice.setAttribute('aria-pressed', String(choice === button));
      const keys = categories[button.textContent];
      for (const place of places) place.hidden = Boolean(keys && !keys.includes(place.dataset.placeKey));
    });
  }
  // Only the checked ledger can supply links. Empty ledger means no placeholder links.
  fetch('proof/proof-data.json', { cache: 'no-store' })
    .then(response => { if (!response.ok) throw new Error(); return response.json(); })
    .then(data => {
      for (const place of places) {
        for (const record of data.entries || []) {
          if (record.placeKey !== place.dataset.placeKey || record.status !== 'published' ||
              !record.checkedBy || !record.checkedAt || !record.place || !record.missingPiece || !record.line ||
              !/^[a-zA-Z0-9_-]+$/.test(record.id || '')) continue;
          try {
            const evidence = new URL(record.proofUrl);
            if (!['https:', 'http:'].includes(evidence.protocol) || evidence.username || evidence.password) continue;
          } catch { continue; }
          const link = document.createElement('a');
          link.href = 'proof/#record-' + record.id;
          link.textContent = 'Checked field record';
          place.append(link);
          if (/^https:\/\/github\.com\/NeoColumbus\/Project-Columbus\/issues\/\d+$/.test(record.sourceIssue || '')) {
            const lead = document.createElement('a');
            lead.href = record.sourceIssue;
            lead.textContent = 'Source lead / review trail';
            place.append(lead);
          }
        }
      }
    }).catch(() => { /* Missing ledger must not invent a destination. */ });
})();
