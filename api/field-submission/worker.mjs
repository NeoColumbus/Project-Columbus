const DEFAULT_REPO = "NeoColumbus/Project-Columbus";
const DEFAULT_ALLOWED_ORIGINS = [
  "https://neocolumbus.github.io",
  "http://127.0.0.1:8123",
  "http://127.0.0.1:8131",
  "http://127.0.0.1:8132",
  "http://127.0.0.1:8133",
  "http://localhost:8123",
  "http://localhost:8131",
  "http://localhost:8132",
  "http://localhost:8133"
];

const LABELS = {
  "field-report": ["4F8A74", "Field report from the public signal path."],
  "public-submission": ["F4B037", "Submitted through the public no-login path."],
  "needs-review": ["B77836", "Needs maintainer review before publication."]
};

export default {
  async fetch(request, env) {
    const origin = request.headers.get("origin") || "";
    const cors = corsHeaders(origin, env);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: isAllowedOrigin(origin, env) ? 204 : 403,
        headers: cors
      });
    }

    if (!isAllowedOrigin(origin, env)) {
      return json({ ok: false, error: "Origin not allowed." }, 403, cors);
    }

    const url = new URL(request.url);
    if (request.method !== "POST" || !["/", "/field-report"].includes(url.pathname)) {
      return json({ ok: false, error: "Use POST /field-report." }, 404, cors);
    }

    if (!env.GITHUB_TOKEN) {
      return json({ ok: false, error: "Submission API is not configured." }, 503, cors);
    }

    let payload;
    try {
      payload = await readPayload(request);
    } catch (error) {
      return json({ ok: false, error: error.message }, 400, cors);
    }

    if (payload.website) {
      return json({ ok: true, queued: true }, 202, cors);
    }

    const turnstileOk = await verifyTurnstile(payload.turnstileToken, request, env);
    if (!turnstileOk) {
      return json({ ok: false, error: "Verification failed." }, 403, cors);
    }

    const report = normalizeReport(payload);
    const validation = validateReport(report);
    if (validation) {
      return json({ ok: false, error: validation }, 422, cors);
    }

    const tripwire = tripwireReason(report);
    if (tripwire) {
      return json({ ok: false, error: tripwire }, 422, cors);
    }

    try {
      const issue = await createGitHubIssue(report, env);
      return json({
        ok: true,
        issueNumber: issue.number,
        issueUrl: issue.html_url
      }, 201, cors);
    } catch (error) {
      return json({ ok: false, error: error.message }, 502, cors);
    }
  }
};

function allowedOrigins(env) {
  const raw = env.ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS.join(",");
  return raw.split(",").map((value) => value.trim()).filter(Boolean);
}

function isAllowedOrigin(origin, env) {
  const allowed = allowedOrigins(env);
  return !origin || allowed.includes("*") || allowed.includes(origin);
}

function corsHeaders(origin, env) {
  const allowed = allowedOrigins(env);
  const allowOrigin = allowed.includes("*") ? "*" : allowed.includes(origin) ? origin : allowed[0];

  return {
    "access-control-allow-origin": allowOrigin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    "vary": "Origin"
  };
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers,
      "content-type": "application/json; charset=utf-8"
    }
  });
}

async function readPayload(request) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 12000) throw new Error("Submission is too large.");

  const text = await request.text();
  if (text.length > 12000) throw new Error("Submission is too large.");

  try {
    return JSON.parse(text || "{}");
  } catch {
    throw new Error("Submission must be JSON.");
  }
}

function clean(value, max = 500) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function normalizeReport(payload) {
  const source = payload.source && typeof payload.source === "object" ? payload.source : {};

  return {
    kind: clean(payload.kind, 60) || "Signal",
    place: clean(payload.place, 180),
    breakText: clean(payload.break || payload.breakText, 500),
    line: clean(payload.line, 240),
    proof: clean(payload.proof, 900),
    card: clean(payload.card, 5000),
    source: {
      drop: clean(source.drop, 40),
      asset: clean(source.asset, 120),
      source: clean(source.source, 120),
      url: clean(source.url || payload.url, 500)
    }
  };
}

function validateReport(report) {
  if (!report.place) return "Add a real place.";
  if (!report.breakText) return "Name what is missing.";
  if (!report.line) return "Add one public line.";
  if (report.place.length < 3) return "Place is too short.";
  if (report.line.length < 5) return "Line is too short.";
  return "";
}

function tripwireReason(report) {
  const text = [
    report.kind,
    report.place,
    report.breakText,
    report.line,
    report.proof,
    report.card
  ].join("\n");

  if (/\b(casino|crypto|airdrop|forex|telegram|whatsapp|seo backlinks?|guest post|loan offer|work from home)\b/i.test(text)) {
    return "Spam pattern detected.";
  }

  if (/(BEGIN (RSA|OPENSSH|EC|DSA)? ?PRIVATE KEY|api[_-]?key\s*[:=]|secret\s*[:=]|password\s*[:=]|token\s*[:=]\s*[A-Za-z0-9_\-.]{20,})/i.test(text)) {
    return "Possible credential detected.";
  }

  if (/(as an ai language model|i cannot browse the internet|lorem ipsum)/i.test(text)) {
    return "Placeholder or low-effort dump detected.";
  }

  return "";
}

async function verifyTurnstile(token, request, env) {
  if (!env.TURNSTILE_SECRET) return true;
  if (!token) return false;

  const form = new URLSearchParams({
    secret: env.TURNSTILE_SECRET,
    response: token
  });

  const ip = request.headers.get("cf-connecting-ip");
  if (ip) form.set("remoteip", ip);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form
  });

  if (!response.ok) return false;
  const data = await response.json();
  return data.success === true;
}

async function createGitHubIssue(report, env) {
  const repo = env.GITHUB_REPO || DEFAULT_REPO;
  const labels = (env.GITHUB_LABELS || "field-report,public-submission,needs-review")
    .split(",")
    .map((label) => label.trim())
    .filter(Boolean);

  for (const label of labels) {
    await ensureGitHubLabel(repo, label, env);
  }

  const title = `[Field] ${report.kind}: ${report.place}`.slice(0, 240);
  const body = issueBody(report);
  const issue = await githubFetch(repo, "/issues", env, {
    method: "POST",
    body: JSON.stringify({ title, body, labels })
  });

  if (issue.status === 422 && labels.length > 0) {
    return githubFetch(repo, "/issues", env, {
      method: "POST",
      body: JSON.stringify({ title, body })
    }).then(assertGitHubOk);
  }

  return assertGitHubOk(issue);
}

async function ensureGitHubLabel(repo, label, env) {
  const response = await githubFetch(repo, `/labels/${encodeURIComponent(label)}`, env);
  if (response.ok) return;
  if (response.status !== 404) return;

  const [color, description] = LABELS[label] || ["E8DDC7", "Full City Columbus label."];
  await githubFetch(repo, "/labels", env, {
    method: "POST",
    body: JSON.stringify({ name: label, color, description })
  });
}

async function githubFetch(repo, path, env, options = {}) {
  const response = await fetch(`https://api.github.com/repos/${repo}${path}`, {
    method: options.method || "GET",
    headers: {
      "accept": "application/vnd.github+json",
      "authorization": `Bearer ${env.GITHUB_TOKEN}`,
      "content-type": "application/json",
      "user-agent": "full-city-columbus-field-api",
      "x-github-api-version": "2022-11-28"
    },
    body: options.body
  });

  const data = await response.json().catch(() => ({}));
  return {
    ok: response.ok,
    status: response.status,
    data
  };
}

function assertGitHubOk(result) {
  if (result.ok) return result.data;
  const message = result.data?.message || `GitHub request failed with status ${result.status}.`;
  throw new Error(message);
}

function issueBody(report) {
  const sourceLines = [
    report.source.drop ? `- Drop: ${report.source.drop}` : "",
    report.source.asset ? `- Asset: ${report.source.asset}` : "",
    report.source.source ? `- Source: ${report.source.source}` : "",
    report.source.url ? `- URL: ${report.source.url}` : ""
  ].filter(Boolean).join("\n") || "No source parameters.";

  return [
    "Submitted through the public field API.",
    "",
    "## Place",
    report.place,
    "",
    "## Proof",
    report.proof || "No proof link supplied.",
    "",
    "## What Is Missing",
    report.breakText,
    "",
    "## Line",
    report.line,
    "",
    "## Source",
    sourceLines,
    "",
    "## Field Card",
    "```txt",
    report.card || "(No field card supplied.)",
    "```"
  ].join("\n");
}
