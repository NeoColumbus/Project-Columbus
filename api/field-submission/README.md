# Field Submission API

This is the tiny no-login intake API for the public scan path.

It receives a field card from the static site and opens a GitHub issue for maintainer review.

Every accepted report is a LEAD, including reports with evidence links. No proof link is required at intake. Publication as PROOF requires a maintainer check and a public evidence URL; see [publishing](../../submissions/PUBLISHING.md).

## Abuse Protection

The configured `SUBMISSION_RATE_LIMITER` permits five attempts per client IP per 60 seconds at an edge location. It is approximate, not a global quota; shared networks share the allowance. It does not persist an IP in an issue or build a visitor profile. Missing bindings leave legacy/local deployments operational; a configured limiter failure returns a retryable 503 with the GitHub fallback still available. CORS is not authentication or an abuse barrier.

Bodies are capped at 12,000 bytes while streaming, even without Content-Length. Malformed/non-object JSON is rejected. Honeypot and content tripwires remain. Upstream timeouts return bounded public errors without secrets or GitHub response details. No live deployment is implied by a code change.

Rate-limit API reference: https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/

## Shape

Runtime target:

- Cloudflare Workers

Route:

- `POST /field-report`

Required JSON fields:

- `kind`
- `place`
- `break`
- `line`

Optional JSON fields:

- `proof`
- `card`
- `source`
- `website`
- `turnstileToken`

`website` is a bot honeypot. Real users should never fill it.

## Secrets

Set these in the worker environment:

- `GITHUB_TOKEN`

Optional:

- `GITHUB_REPO`
- `GITHUB_LABELS`
- `ALLOWED_ORIGINS`
- `TURNSTILE_SECRET`

Recommended `ALLOWED_ORIGINS`:

```txt
https://neocolumbus.github.io
```

For local testing, include localhost origins separated by commas.

## GitHub Token

Use a fine-grained GitHub token with access to `NeoColumbus/Project-Columbus`.

Required permission:

- Issues: read and write

Do not commit the token.

## Deploy

This folder includes a deployable `wrangler.toml`.

Manual deploy:

```sh
pnpm run field-api:deploy
```

Dry-run the Worker bundle:

```sh
pnpm run field-api:dry-run
```

Pressure-test the Worker logic with mocked GitHub and Turnstile:

```sh
pnpm run test:field-api
```

To push the concurrency count higher:

```sh
FIELD_API_PRESSURE_COUNT=5000 pnpm run test:field-api
```

PowerShell:

```powershell
$env:FIELD_API_PRESSURE_COUNT = "5000"; pnpm run test:field-api
```

GitHub Actions deploy:

- add `CLOUDFLARE_API_TOKEN` as a repository secret
- add `CLOUDFLARE_ACCOUNT_ID` as a repository secret
- run the `Deploy Field Submission API` workflow

After deploy, set the endpoint in:

- [../../site/config.js](../../site/config.js)

Example:

```js
window.FULL_CITY_CONFIG = {
  fieldSubmissionEndpoint: "https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev/field-report",
  turnstileSiteKey: ""
};
```

Set the worker secret before accepting submissions:

```sh
wrangler secret put GITHUB_TOKEN
```

## Turnstile

If `TURNSTILE_SECRET` is set, submissions must include a valid `turnstileToken`.

The signal page renders a Turnstile widget only when `turnstileSiteKey` is set in [../../site/config.js](../../site/config.js).

With no secret and no site key, submissions continue normally. Configure both as a coordinated deployment; setting only the secret would block the public form. Optionally set `TURNSTILE_HOSTNAME=neocolumbus.github.io` to bind successful verification to the public host. Verification outages fail closed with a GitHub fallback, not an unhandled exception. Never commit the secret. Turnstile is abuse protection, not analytics.

To turn it on:

1. Create a Cloudflare Turnstile widget for the public site domain.
2. Set `turnstileSiteKey` in [../../site/config.js](../../site/config.js).
3. Set the matching worker secret:

```sh
wrangler secret put TURNSTILE_SECRET
```
