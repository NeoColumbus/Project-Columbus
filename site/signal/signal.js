(function () {
  const scanPath = "https://neocolumbus.github.io/Project-Columbus/signal/";
  const issueBase = "https://github.com/NeoColumbus/Project-Columbus/issues/new";
  const query = new URLSearchParams(window.location.search);

  const fields = {
    kind: document.querySelector("#field-kind"),
    place: document.querySelector("#field-place"),
    break: document.querySelector("#field-break"),
    line: document.querySelector("#field-line"),
    proof: document.querySelector("#field-proof"),
    output: document.querySelector("#field-card-output"),
    github: document.querySelector("#github-field-report"),
    status: document.querySelector("#field-card-status")
  };

  if (!fields.output) return;

  const fallback = {
    "Dead Wall": {
      break: "Blank frontage. Dead street.",
      line: "Density deserves beauty."
    },
    Transit: {
      break: "Stop lacks shelter, shade, light, crossing, seating, route information, or dignity.",
      line: "Transit is the nervous system."
    },
    Neighborhood: {
      break: "This place is treated like a fragment.",
      line: "[Place] is not a fragment."
    },
    Machine: {
      break: "Water, power, land, tax, compute, or data is being treated as extraction.",
      line: "The machine pays tribute."
    }
  };

  function clean(value, empty) {
    const trimmed = String(value || "").trim();
    return trimmed || empty;
  }

  function sourceText() {
    const drop = query.get("drop");
    const asset = query.get("asset");
    const source = query.get("source");
    const parts = [];

    if (drop) parts.push(`drop=${drop}`);
    if (asset) parts.push(`asset=${asset}`);
    if (source) parts.push(`source=${source}`);

    return parts.join(" / ");
  }

  function buildCard() {
    const kind = clean(fields.kind.value, "Signal");
    const place = clean(fields.place.value, "[place]");
    const breakText = clean(fields.break.value, fallback[kind]?.break || "[break]");
    const line = clean(fields.line.value, fallback[kind]?.line || "[line]");
    const proof = clean(fields.proof.value, "[photo / post / note]");
    const source = sourceText();

    const lines = [
      "SIGNAL SEEN / FULL CITY COLUMBUS",
      "",
      `TYPE: ${kind}`,
      `PLACE: ${place}`,
      `BREAK: ${breakText}`,
      `LINE: ${line}`,
      `PROOF: ${proof}`,
    ];

    if (source) lines.push(`SOURCE: ${source}`);

    lines.push("", "#FullCityColumbus #SignalSeen", scanPath);

    return lines.join("\n");
  }

  function cardUrl() {
    const params = new URLSearchParams({
      kind: clean(fields.kind.value, "Signal"),
      place: clean(fields.place.value, ""),
      break: clean(fields.break.value, ""),
      line: clean(fields.line.value, ""),
      proof: clean(fields.proof.value, "")
    });

    for (const key of Array.from(params.keys())) {
      if (!params.get(key)) params.delete(key);
    }

    const queryString = params.toString();
    const suffix = queryString ? `?${queryString}` : "";

    return `${window.location.origin}${window.location.pathname}${suffix}#field-card`;
  }

  function updateCard() {
    const card = buildCard();
    const title = `[Field] ${clean(fields.kind.value, "Signal")}: ${clean(fields.place.value, "")}`;
    const params = new URLSearchParams({
      template: "field-report.md",
      title,
      body: card
    });

    fields.output.value = card;
    fields.github.href = `${issueBase}?${params.toString()}`;
  }

  async function copyCard() {
    const card = buildCard();
    try {
      await navigator.clipboard.writeText(card);
      fields.status.textContent = "Copied.";
    } catch (error) {
      fields.output.focus();
      fields.output.select();
      document.execCommand("copy");
      fields.status.textContent = "Copied.";
    }
  }

  async function shareCard() {
    const card = buildCard();
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Signal seen / Full City Columbus",
          text: card,
          url: cardUrl()
        });
        fields.status.textContent = "Shared.";
        return;
      } catch (error) {
        if (error.name === "AbortError") return;
      }
    }

    await copyCard();
    fields.status.textContent = "Share unavailable. Card copied.";
  }

  async function copyCardLink() {
    try {
      await navigator.clipboard.writeText(cardUrl());
      fields.status.textContent = "Card link copied.";
    } catch (error) {
      await copyCard();
      fields.status.textContent = "Link unavailable. Card copied.";
    }
  }

  function downloadCard() {
    const blob = new Blob([buildCard()], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const place = clean(fields.place.value, "signal")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "signal";

    link.href = url;
    link.download = `full-city-field-card-${place}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    fields.status.textContent = "Downloaded.";
  }

  function hydrateFromUrl() {
    const map = {
      kind: "kind",
      place: "place",
      break: "break",
      line: "line",
      proof: "proof"
    };

    for (const [field, key] of Object.entries(map)) {
      const value = query.get(key);
      if (value && fields[field]) fields[field].value = value;
    }
  }

  document.querySelectorAll("[data-kind]").forEach((card) => {
    card.addEventListener("click", () => {
      fields.kind.value = card.dataset.kind || fields.kind.value;
      fields.break.value = card.dataset.break || fields.break.value;
      fields.line.value = card.dataset.line || fields.line.value;
      updateCard();
      requestAnimationFrame(() => fields.place.focus({ preventScroll: true }));
    });
  });

  Object.values(fields).forEach((field) => {
    if (field && "addEventListener" in field) {
      field.addEventListener("input", updateCard);
      field.addEventListener("change", updateCard);
    }
  });

  document.querySelector("#copy-field-card")?.addEventListener("click", copyCard);
  document.querySelector("#share-field-card")?.addEventListener("click", shareCard);
  document.querySelector("#copy-card-link")?.addEventListener("click", copyCardLink);
  document.querySelector("#download-field-card")?.addEventListener("click", downloadCard);

  hydrateFromUrl();
  updateCard();
})();
