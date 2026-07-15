(function () {
  const scanPath = "https://neocolumbus.github.io/Project-Columbus/site/signal/";
  const issueBase = "https://github.com/NeoColumbus/Project-Columbus/issues/new";
  const query = new URLSearchParams(window.location.search);
  const config = window.FULL_CITY_CONFIG || {};
  let turnstileToken = "";
  let turnstileWidgetId = null;

  const fields = {
    kind: document.querySelector("#field-kind"),
    place: document.querySelector("#field-place"),
    break: document.querySelector("#field-break"),
    line: document.querySelector("#field-line"),
    proof: document.querySelector("#field-proof"),
    website: document.querySelector("#field-website"),
    output: document.querySelector("#field-card-output"),
    github: document.querySelector("#github-field-report"),
    status: document.querySelector("#field-card-status"),
    turnstileWrap: document.querySelector("#turnstile-wrap"),
    turnstile: document.querySelector("#field-turnstile")
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
    const source = sourceData();
    const parts = [];

    if (source.drop) parts.push(`drop=${source.drop}`);
    if (source.asset) parts.push(`asset=${source.asset}`);
    if (source.source) parts.push(`source=${source.source}`);

    return parts.join(" / ");
  }

  function sourceData() {
    const drop = query.get("drop");
    const asset = query.get("asset");
    const source = query.get("source");

    return {
      drop: drop || "",
      asset: asset || "",
      source: source || "",
      url: window.location.href
    };
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
      proof: clean(fields.proof.value, ""),
      drop: query.get("drop") || "",
      asset: query.get("asset") || "",
      source: query.get("source") || ""
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

  function buildPayload() {
    return {
      kind: clean(fields.kind.value, "Signal"),
      place: clean(fields.place.value, ""),
      break: clean(fields.break.value, fallback[fields.kind.value]?.break || ""),
      line: clean(fields.line.value, fallback[fields.kind.value]?.line || ""),
      proof: clean(fields.proof.value, ""),
      card: buildCard(),
      source: sourceData(),
      website: clean(fields.website?.value, ""),
      turnstileToken
    };
  }

  function canSubmitPayload(payload) {
    if (!payload.place) return "Add a place first.";
    if (!payload.break) return "Name what is missing.";
    if (!payload.line) return "Add one public line.";
    return "";
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

  async function submitFieldCard() {
    const endpoint = String(config.fieldSubmissionEndpoint || "").trim();
    const payload = buildPayload();
    const validation = canSubmitPayload(payload);
    const button = document.querySelector("#submit-field-card");

    if (validation) {
      fields.status.textContent = validation;
      if (!payload.place) fields.place.focus();
      return;
    }

    if (!endpoint) {
      await copyCard();
      fields.status.textContent = "Public inbox not configured yet. Card copied.";
      return;
    }

    if (config.turnstileSiteKey && !turnstileToken) {
      fields.status.textContent = "Complete verification first.";
      return;
    }

    button.disabled = true;
    fields.status.textContent = "Sending.";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Submission failed.");
      }

      fields.status.textContent = data.issueNumber
        ? `Submitted for review. Issue ${data.issueNumber}.`
        : "Submitted for review.";

      if (data.issueUrl) fields.github.href = data.issueUrl;
      resetTurnstile();
    } catch (error) {
      await copyCard();
      fields.status.textContent = "Submission failed. Card copied.";
    } finally {
      button.disabled = false;
    }
  }

  function resetTurnstile() {
    turnstileToken = "";

    if (turnstileWidgetId !== null && window.turnstile?.reset) {
      window.turnstile.reset(turnstileWidgetId);
    }
  }

  function setupTurnstile() {
    const siteKey = String(config.turnstileSiteKey || "").trim();

    if (!siteKey || !fields.turnstileWrap || !fields.turnstile) return;

    fields.turnstileWrap.hidden = false;
    window.onFullCityTurnstileLoad = () => {
      if (!window.turnstile || turnstileWidgetId !== null) return;

      turnstileWidgetId = window.turnstile.render(fields.turnstile, {
        sitekey: siteKey,
        callback(token) {
          turnstileToken = token;
          fields.status.textContent = "Verification ready.";
        },
        "expired-callback"() {
          turnstileToken = "";
          fields.status.textContent = "Verification expired.";
        },
        "error-callback"() {
          turnstileToken = "";
          fields.status.textContent = "Verification unavailable.";
        }
      });
    };

    if (window.turnstile) {
      window.onFullCityTurnstileLoad();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onFullCityTurnstileLoad&render=explicit";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
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
  document.querySelector("#submit-field-card")?.addEventListener("click", submitFieldCard);
  document.querySelector("#share-field-card")?.addEventListener("click", shareCard);
  document.querySelector("#copy-card-link")?.addEventListener("click", copyCardLink);
  document.querySelector("#download-field-card")?.addEventListener("click", downloadCard);

  hydrateFromUrl();
  setupTurnstile();
  updateCard();
})();
