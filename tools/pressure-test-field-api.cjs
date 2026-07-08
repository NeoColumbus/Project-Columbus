#!/usr/bin/env node

const assert = require("node:assert/strict");
const path = require("node:path");
const { performance } = require("node:perf_hooks");
const { pathToFileURL } = require("node:url");

const origin = "https://neocolumbus.github.io";
const workerUrl = "https://field-api.example.test/field-report";
const pressureCount = Number(process.env.FIELD_API_PRESSURE_COUNT || 300);
const workerPath = path.join(__dirname, "..", "api", "field-submission", "worker.mjs");
let worker;

const baseEnv = {
  GITHUB_TOKEN: "test-token",
  GITHUB_REPO: "NeoColumbus/Project-Columbus",
  GITHUB_LABELS: "field-report,public-submission,needs-review",
  ALLOWED_ORIGINS: origin
};

function okJson(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

function issuePayload(index = 1) {
  return {
    kind: "Dead Wall",
    place: `Test Block ${index}, Columbus`,
    break: "Blank frontage. Dead street.",
    line: "Density deserves beauty.",
    proof: `Photo on file: https://example.com/proof-${index}.jpg`,
    card: [
      "SIGNAL SEEN / FULL CITY COLUMBUS",
      "",
      "TYPE: Dead Wall",
      `PLACE: Test Block ${index}, Columbus`,
      "BREAK: Blank frontage. Dead street.",
      "LINE: Density deserves beauty.",
      `PROOF: Photo on file: https://example.com/proof-${index}.jpg`
    ].join("\n"),
    source: {
      drop: "001",
      asset: "pressure-test",
      source: "automated",
      url: "https://neocolumbus.github.io/Project-Columbus/signal/?drop=001"
    }
  };
}

function createMockFetch(options = {}) {
  let issueNumber = 8000;
  let failedIssueOnce = false;
  const calls = [];

  const mockFetch = async (url, init = {}) => {
    const href = String(url);
    const method = init.method || "GET";
    calls.push({ url: href, method, body: init.body || "" });

    if (href === "https://challenges.cloudflare.com/turnstile/v0/siteverify") {
      const params = new URLSearchParams(String(init.body || ""));
      return okJson({ success: params.get("response") === "turnstile-pass" });
    }

    if (!href.startsWith("https://api.github.com/")) {
      return okJson({ message: "Unhandled mock URL" }, 500);
    }

    const pathname = new URL(href).pathname;

    if (method === "GET" && pathname.includes("/labels/")) {
      return okJson({ message: "Not Found" }, 404);
    }

    if (method === "POST" && pathname.endsWith("/labels")) {
      return okJson({ name: "created" }, 201);
    }

    if (method === "POST" && pathname.endsWith("/issues")) {
      const requestBody = JSON.parse(String(init.body || "{}"));

      if (options.failFirstIssueWithLabels && requestBody.labels && !failedIssueOnce) {
        failedIssueOnce = true;
        return okJson({ message: "Validation Failed" }, 422);
      }

      issueNumber += 1;
      return okJson({
        number: issueNumber,
        html_url: `https://github.com/NeoColumbus/Project-Columbus/issues/${issueNumber}`
      }, 201);
    }

    return okJson({ message: `Unhandled mock GitHub path: ${method} ${pathname}` }, 500);
  };

  mockFetch.calls = calls;
  return mockFetch;
}

async function withMockFetch(mockFetch, callback) {
  const realFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;
  try {
    return await callback();
  } finally {
    globalThis.fetch = realFetch;
  }
}

function requestFor(payload, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.origin !== null) headers.set("origin", options.origin || origin);

  if (options.json !== false) {
    headers.set("content-type", "application/json");
  }

  const init = {
    method: options.method || "POST",
    headers
  };

  if (!["GET", "HEAD", "OPTIONS"].includes(init.method)) {
    init.body = typeof payload === "string" ? payload : JSON.stringify(payload || {});
  }

  return new Request(options.url || workerUrl, init);
}

async function post(payload, env = baseEnv, options = {}) {
  return worker.fetch(requestFor(payload, options), env);
}

async function json(response) {
  return response.json();
}

function callsTo(mockFetch, method, suffix) {
  return mockFetch.calls.filter((call) => {
    const pathname = new URL(call.url).pathname;
    return call.method === method && pathname.endsWith(suffix);
  });
}

async function test(name, callback) {
  const start = performance.now();
  await callback();
  const ms = performance.now() - start;
  console.log(`ok - ${name} (${ms.toFixed(0)}ms)`);
}

async function main() {
  const workerModule = await import(pathToFileURL(workerPath).href);
  worker = workerModule.default;

  await test("allows configured CORS preflight", async () => {
    const response = await worker.fetch(requestFor(null, { method: "OPTIONS" }), baseEnv);
    assert.equal(response.status, 204);
    assert.equal(response.headers.get("access-control-allow-origin"), origin);
  });

  await test("rejects disallowed origins", async () => {
    const response = await post(issuePayload(), baseEnv, { origin: "https://bad.example" });
    assert.equal(response.status, 403);
    assert.equal((await json(response)).error, "Origin not allowed.");
  });

  await test("fails closed when GitHub token is missing", async () => {
    const response = await post(issuePayload(), { ...baseEnv, GITHUB_TOKEN: "" });
    assert.equal(response.status, 503);
    assert.equal((await json(response)).error, "Submission API is not configured.");
  });

  await test("short-circuits honeypot submissions", async () => {
    const mockFetch = createMockFetch();
    await withMockFetch(mockFetch, async () => {
      const response = await post({ ...issuePayload(), website: "https://spam.example" });
      assert.equal(response.status, 202);
      assert.deepEqual(await json(response), { ok: true, queued: true });
      assert.equal(mockFetch.calls.length, 0);
    });
  });

  await test("requires and verifies Turnstile when configured", async () => {
    const mockFetch = createMockFetch();
    const env = { ...baseEnv, TURNSTILE_SECRET: "secret" };

    await withMockFetch(mockFetch, async () => {
      const missing = await post(issuePayload(), env);
      assert.equal(missing.status, 403);
      assert.equal((await json(missing)).error, "Verification failed.");

      const passed = await post({ ...issuePayload(), turnstileToken: "turnstile-pass" }, env);
      assert.equal(passed.status, 201);
      assert.equal(callsTo(mockFetch, "POST", "/issues").length, 1);
    });
  });

  await test("creates a GitHub issue with review labels and source body", async () => {
    const mockFetch = createMockFetch();
    await withMockFetch(mockFetch, async () => {
      const response = await post(issuePayload(7));
      const body = await json(response);
      assert.equal(response.status, 201);
      assert.equal(body.ok, true);
      assert.equal(body.issueNumber, 8001);

      const issueCalls = callsTo(mockFetch, "POST", "/issues");
      assert.equal(issueCalls.length, 1);

      const issueBody = JSON.parse(String(issueCalls[0].body));
      assert.equal(issueBody.title, "[Field] Dead Wall: Test Block 7, Columbus");
      assert.deepEqual(issueBody.labels, ["field-report", "public-submission", "needs-review"]);
      assert.match(issueBody.body, /## Place\nTest Block 7, Columbus/);
      assert.match(issueBody.body, /## Field Card/);
    });
  });

  await test("falls back when GitHub rejects issue labels", async () => {
    const mockFetch = createMockFetch({ failFirstIssueWithLabels: true });
    await withMockFetch(mockFetch, async () => {
      const response = await post(issuePayload(9));
      assert.equal(response.status, 201);
      assert.equal((await json(response)).ok, true);
      assert.equal(callsTo(mockFetch, "POST", "/issues").length, 2);
    });
  });

  await test("rejects spam and placeholder patterns before GitHub", async () => {
    const mockFetch = createMockFetch();
    await withMockFetch(mockFetch, async () => {
      const response = await post({ ...issuePayload(), proof: "casino crypto airdrop" });
      assert.equal(response.status, 422);
      assert.equal((await json(response)).error, "Spam pattern detected.");
      assert.equal(mockFetch.calls.length, 0);
    });
  });

  await test("rejects oversized payloads before GitHub", async () => {
    const mockFetch = createMockFetch();
    await withMockFetch(mockFetch, async () => {
      const response = await post(`{"place":"${"x".repeat(12100)}"}`);
      assert.equal(response.status, 400);
      assert.equal((await json(response)).error, "Submission is too large.");
      assert.equal(mockFetch.calls.length, 0);
    });
  });

  await test(`${pressureCount} concurrent accepted submissions`, async () => {
    const mockFetch = createMockFetch();

    await withMockFetch(mockFetch, async () => {
      const start = performance.now();
      const responses = await Promise.all(
        Array.from({ length: pressureCount }, (_, index) => post(issuePayload(index + 1)))
      );
      const elapsed = performance.now() - start;
      const statuses = responses.map((response) => response.status);

      assert.equal(statuses.every((status) => status === 201), true);
      assert.equal(callsTo(mockFetch, "POST", "/issues").length, pressureCount);
      console.log(`     ${pressureCount} accepted in ${elapsed.toFixed(0)}ms; mock network calls=${mockFetch.calls.length}`);
    });
  });

  console.log("field API pressure suite passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
