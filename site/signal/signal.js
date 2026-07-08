(function () {
  const scanPath = "https://neocolumbus.github.io/Project-Columbus/signal/";
  const issueBase = "https://github.com/NeoColumbus/Project-Columbus/issues/new";

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

  function buildCard() {
    const kind = clean(fields.kind.value, "Signal");
    const place = clean(fields.place.value, "[place]");
    const breakText = clean(fields.break.value, fallback[kind]?.break || "[break]");
    const line = clean(fields.line.value, fallback[kind]?.line || "[line]");
    const proof = clean(fields.proof.value, "[photo / post / note]");

    return [
      "SIGNAL SEEN / FULL CITY COLUMBUS",
      "",
      `TYPE: ${kind}`,
      `PLACE: ${place}`,
      `BREAK: ${breakText}`,
      `LINE: ${line}`,
      `PROOF: ${proof}`,
      "",
      "#FullCityColumbus #SignalSeen",
      scanPath
    ].join("\n");
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
          text: card
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

  updateCard();
})();
