(function () {
  const grid = document.querySelector("[data-proof-grid]");
  const status = document.querySelector("[data-proof-status]");

  if (!grid) return;

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function entryCard(entry, index) {
    const proof = entry.proofUrl
      ? `<a href="${escapeHtml(entry.proofUrl)}">Proof</a>`
      : escapeHtml(entry.proof || "Proof held for review");

    return `
      <article class="proof-card proof-card-entry" ${/^[a-zA-Z0-9_-]+$/.test(entry.id || '') ? `id="record-${entry.id}"` : ''}>
        <span>${escapeHtml(entry.date || `Entry ${String(index + 1).padStart(3, "0")}`)} / ${escapeHtml(entry.type || "Signal")} / checked field proof</span>
        <strong>${escapeHtml(entry.place || "Real place")}</strong>
        <em>${escapeHtml(entry.line || "No fake proof.")}</em>
        <p>${escapeHtml(entry.missingPiece || entry.break || "Missing piece under review.")}</p>
        <p>${proof}</p>
        <p>Submission via public issue / checked ${escapeHtml(entry.checkedAt)}</p>
        ${entry.context ? `<p>Context / limitations: ${escapeHtml(entry.context)}</p>` : ''}
      </article>
    `;
  }

  function slotCard(slot, index) {
    return `
      <article class="proof-card proof-card-open">
        <span>${escapeHtml(slot.slot || `Slot ${String(index + 1).padStart(3, "0")}`)} / ${escapeHtml(slot.status || "open")}</span>
        <strong>${escapeHtml(slot.type || "Signal")}.</strong>
        <em>${escapeHtml(slot.line || "Bring back a real place.")}</em>
      </article>
    `;
  }

  fetch("proof-data.json", { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error("Proof data unavailable");
      return response.json();
    })
    .then((data) => {
      const entries = (Array.isArray(data.entries) ? data.entries : []).filter((entry) => {
        try {
          const url = new URL(entry.proofUrl);
          return entry.status === "published" && entry.checkedAt && entry.checkedBy &&
            entry.place && entry.missingPiece && entry.line &&
            ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
        } catch { return false; }
      });
      const openSlots = Array.isArray(data.openSlots) ? data.openSlots : [];

      if (entries.length > 0) {
        grid.innerHTML = entries.map(entryCard).join("");
        if (/^#record-[a-zA-Z0-9_-]+$/.test(location.hash)) document.getElementById(location.hash.slice(1))?.scrollIntoView();
      } else if (openSlots.length > 0) {
        grid.innerHTML = openSlots.map(slotCard).join("");
      }

      if (status) {
        status.textContent = entries.length > 0
          ? `${entries.length} checked proof ${entries.length === 1 ? "entry" : "entries"}`
          : `${openSlots.length} open slots / wall starts clean`;
      }
    })
    .catch(() => {
      if (status) status.textContent = "Proof ledger unavailable";
    });
})();
