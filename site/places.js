(function () {
  const places = document.querySelectorAll('[data-place-key]');
  if (!places.length) return;
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
