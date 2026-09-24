(function () {
  const scanPath = "https://neocolumbus.github.io/Project-Columbus/site/signal/";
  const query = new URLSearchParams(window.location.search);
  const config = window.FULL_CITY_CONFIG || {};
  let turnstileToken = "";
  let turnstileWidgetId = null;
  const intakeAvailable = config.fieldSubmissionEnabled === true && Boolean(config.turnstileSiteKey) && Boolean(config.fieldSubmissionEndpoint);

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
    const proof = clean(fields.proof.value, "No evidence supplied; lead pending verification.");
    const source = sourceText();

    const lines = [
      "SIGNAL SEEN / FULL CITY COLUMBUS",
      "",
      `TYPE: ${kind}`,
      "STATE: LEAD / pending verification",
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
    fields.output.value = card;
    fields.line.placeholder = fallback[fields.kind.value]?.line || 'One-sentence summary';
    fields.github.href = "https://github.com/NeoColumbus/Project-Columbus/blob/main/SUBMISSIONS.md";
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
    if (!payload.line) return "Add a one-sentence summary.";
    const limits = { kind: 60, place: 180, break: 500, line: 240, proof: 900 };
    for (const [key, max] of Object.entries(limits)) if (payload[key].length > max) return `Please shorten ${key === 'break' ? 'the condition description' : key === 'line' ? 'the summary' : key} to ${max} characters.`;
    if (payload.place.length < 3 || payload.break.length < 3 || payload.line.length < 5) return "Add a place and condition of at least 3 characters, and a summary of at least 5.";
    return "";
  }

  async function copyText(text, successMessage) {
    try {
      await navigator.clipboard.writeText(text);
      fields.status.textContent = successMessage;
      document.querySelector('#manual-copy-wrap').hidden = true;
      return true;
    } catch {
      const manual = document.querySelector('#manual-copy-output');
      document.querySelector('#manual-copy-wrap').hidden = false;
      manual.value = text;
      manual.focus();
      manual.select();
      fields.status.textContent = "Automatic copy unavailable. Select and copy the text below manually. Nothing was submitted.";
      return false;
    }
  }

  async function copyCard() { return copyText(buildCard(), "Card copied. Nothing submitted."); }

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

    await copyText(card, "Sharing unavailable. Card copied instead; nothing submitted.");
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

    if (!intakeAvailable) {
      fields.status.textContent = "Submissions unavailable. Nothing sent. You can download or copy your card for later.";
      return;
    }
    if (button.disabled) return;

    if (config.turnstileSiteKey && !turnstileToken) {
      fields.status.textContent = "Complete verification first.";
      return;
    }

    button.disabled = true;
    fields.status.textContent = "Sending.";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.ok) {
        const guidance = response.status === 429 ? "Too many attempts. Wait a minute, then verify and retry." : response.status === 403 ? "Verification failed. Complete verification again and retry." : response.status === 422 ? "Report not accepted. Remove personal details or unsupported allegations and check the fields." : "Inbox unavailable. Try again later.";
        fields.status.textContent = `${guidance} Your entries are still here; you can download a copy. Nothing confirmed received.`;
        return;
      }

      fields.status.textContent = "Lead received for private screening. Nothing published yet.";
    } catch (error) {
      fields.status.textContent = `${error.name === 'AbortError' ? 'Request timed out.' : 'Connection failed.'} Receipt is unconfirmed. Your entries are still here. Download a copy, or verify again and retry; duplicate reports are grouped.`;
    } finally {
      clearTimeout(timeout);
      resetTurnstile();
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

    if (!intakeAvailable || !siteKey || !fields.turnstileWrap || !fields.turnstile) return;

    fields.turnstileWrap.hidden = false;
    window.onFullCityTurnstileLoad = () => {
      if (!window.turnstile || turnstileWidgetId !== null) return;

      turnstileWidgetId = window.turnstile.render(fields.turnstile, {
        sitekey: siteKey,
        action: "field-report",
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
    await copyText(cardUrl(), "Card link copied. It contains your entered information. Nothing submitted.");
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
    fields.status.textContent = "Card download started. Nothing submitted.";
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
      if (value && fields[field]) {
        if (field === "kind" && !Array.from(fields.kind.options).some((option) => option.value === value)) {
          const option = document.createElement("option");
          option.value = value;
          option.textContent = value;
          fields.kind.appendChild(option);
        }
        fields[field].value = value;
      }
    }
  }

  function setScanContext() {
    const hints = [query.get("kind"), query.get("asset"), query.get("source")].filter(Boolean).map(value => value.toLowerCase());
    const contexts = [
      [/transit|cota|bus|stop-is-a-room/, "Transit", "Transit signal", "The stop is a room. Put a real stop beside the service research.", "../work/#transit", "Open transit work", "Audit a stop"],
      [/machine|data.center|tribute/, "Machine", "Infrastructure signal", "Water, power, land. Follow the sources behind the civic dividend.", "../work/#ai", "Open infrastructure work", "Name a site"],
      [/dead.wall/, "Dead Wall", "Dead wall signal", "Name the frontage and what it takes from the street. A lead is enough to start.", "#field-card", "Make a field lead", "Report a dead wall"],
      [/neighborhood|fragment/, "Neighborhood", "Neighborhood signal", "Put a place and its missing piece on record.", "#field-card", "Name the fragment", "Name your place"]
    ];
    const numberedKinds = { '001': 'neighborhood', '002': 'neighborhood', '003': 'neighborhood', '004': 'neighborhood', '005': 'machine', '006': 'dead wall', '007': 'transit', '008': 'neighborhood' };
    const context = hints.map(hint => {
      const numbered = hint.match(/^(?:poster|sticker)-(00[1-8])$/);
      const known = numbered && (!query.get('drop') || query.get('drop') === '001') ? numberedKinds[numbered[1]] : hint;
      return contexts.find(([pattern]) => pattern.test(known));
    }).find(Boolean);
    if (!context) return;
    const [, kind, title, copy, href, label, action] = context;
    if (!query.get("kind")) fields.kind.value = kind;
    const box = document.querySelector("#scan-context");
    if (!box) return;
    box.hidden = false;
    document.querySelector("#scan-context-title").textContent = title;
    document.querySelector("#scan-context-copy").textContent = copy;
    const link = document.querySelector("#scan-context-link");
    link.href = href;
    link.textContent = label;
    document.querySelector("#scan-action").textContent = action;
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
  document.querySelector('.field-card-form')?.addEventListener('submit', event => { event.preventDefault(); submitFieldCard(); });
  document.querySelector("#share-field-card")?.addEventListener("click", shareCard);
  document.querySelector("#copy-card-link")?.addEventListener("click", copyCardLink);
  document.querySelector("#download-field-card")?.addEventListener("click", downloadCard);

  hydrateFromUrl();
  const availability = document.querySelector('#inbox-availability');
  const sendButton = document.querySelector('#submit-field-card');
  sendButton.disabled = !intakeAvailable;
  sendButton.textContent = intakeAvailable ? 'Send to project' : 'Submissions unavailable';
  if (availability && intakeAvailable) availability.textContent = 'Private intake is available. Reports wait for screening and human review.';
  setScanContext();
  setupTurnstile();
  updateCard();
})();
