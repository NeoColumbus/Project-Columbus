# Private Field Intake

Deployment status: code prepared, **production activation not verified**. The website's `fieldSubmissionEnabled` is false and its Turnstile key is empty. Card generation and printed URLs remain usable.

**Migration warning:** disabling the site button does not disable a previously deployed Worker. The legacy deployment may still create public GitHub issues if called directly. Deploy this fail-closed Worker or disable its route in Cloudflare before public promotion. Do not claim private production intake until the coordinated checks below pass.

## Contract

POST /field-report (legacy POST / also retained). JSON civic fields: kind, place, break, line, proof, source {drop, asset, source}; website honeypot and turnstileToken. Existing card/source.url fields are screened but not stored. Max body 12,000 bytes, streamed. Evidence optional; public HTTP(S) only, no evidence fetching. Common tracking query parameters removed.

202 means privately received LEAD (or harmless honeypot response), not published, true, or proof. 400 invalid body; 403 failed verification; 422 generic rejection; 429 edge limit; 503 unavailable. Errors never include provider responses/secrets. No public read endpoint.

Required runtime: D1 DB, TURNSTILE_SECRET, TURNSTILE_HOSTNAME, SUBMISSION_RATE_LIMITER. Five attempts per 60 seconds per client IP per edge location, not a globally exact quota. IP used transiently by rate limiting, never stored. Turnstile must return success plus expected hostname and action field-report.

D1 schema: migrations/0001_private_intake.sql. Rejections retain daily counts only. Candidate/quarantine reports retain normalized content and review metadata for 30 days. Fingerprint duplicates update a count atomically. Daily cron expires data; monitor scheduled execution. D1 backup/Time Travel retention is separately managed by Cloudflare.

## Activation Checklist

Use the account that owns full-city-field-submission.neocolumbus.workers.dev. Supply a Cloudflare API token through environment or the dashboard, never this repository or chat. Account permissions must cover Workers scripts, D1, and Turnstile for provisioning. Do not invent a database ID or widget key.

1. Create a managed Turnstile widget for neocolumbus.github.io. Keep production verification bound to that hostname and action field-report.
2. Run `pnpm exec wrangler d1 create full-city-private-intake --config api/field-submission/wrangler.toml`. Add the returned database_id to the existing DB binding in wrangler.toml.
3. Run `pnpm exec wrangler d1 migrations apply full-city-private-intake --remote --config api/field-submission/wrangler.toml`.
4. Set secrets via `pnpm exec wrangler secret put NAME --config api/field-submission/wrangler.toml`: TURNSTILE_SECRET, REVIEW_TOKEN (random 32+ characters), and GITHUB_TOKEN (fine-grained issues write on this repository only). No GitHub credential is needed for private intake itself.
5. Set REVIEWER_ID to a stable maintainer label. Keep CLASSIFIER_ENABLED=false unless a documented private service binding CLASSIFIER is configured.
6. Run `pnpm field-api:deploy`. Before enabling the site, test the deployed API as below.
7. Put only the public widget site key in site/config.js, set fieldSubmissionEnabled=true, and remove the pending status only through that configuration. Deploy Pages.
8. From the actual neocolumbus.github.io signal page, submit a clearly labeled project test with real evidence only when available. Confirm private review, no public issue, explicit LEAD approval/publication, then human proof review. Never publish synthetic test fixtures as participation.

Required repository Actions secrets for workflow deployment: CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID. Worker secrets are separate. If credentials are unavailable, activation remains blocked, not silently bypassed.

## Deployed Verification

Use genuine fresh Turnstile tokens from the configured hostname; never a production test bypass. Verify normal202, invalid token403, sixth rapid attempt429, malformed/oversized400, honeypot202 without a stored row, unauthorized admin401, and generic failure responses. Check D1 privately and confirm zero GitHub issues from intake. Clear synthetic test records; record deployment/version and results without private content. Local SQL/mocks are not these checks.

## Review

`pnpm field:review --summary` requests authenticated `GET /admin/summary` and prints only candidate count, quarantine count, and oldest pending date. It uses the same FIELD_REVIEW_TOKEN and rejects browser origins. No notification channel is configured; connect a private, authorized scheduler/channel before promising alerts, and send only these counts/status fields, never report contents.

`pnpm field:review` reads FIELD_REVIEW_TOKEN from environment and uses HTTPS with redirects forbidden. Default candidate listing, up to100 records; process and repeat. Explicit `--state=quarantine` or `--state=approved`. Actions approve/reject/quarantine/skip; multiple IDs allowed. Publish requires separate confirmation and produces a public LEAD, never PROOF.

Admin API: GET /admin/review?state=candidate; POST same route {action,ids}. Bearer REVIEW_TOKEN required; browser origins rejected; no CORS. The response contains private data: do not paste logs into issues or public CI.

Publication uses a compare-and-set lock. If GitHub times out or a Worker terminates, sending/uncertain records are not automatically retried. Inspect GitHub for the private-intake:ID marker. If an issue exists, reconcile issue_url/status in D1. Only reset to pending after confirming no issue was created. Never reset and retry blindly.

## Checks And References

2026-09-24 access check: local OAuth could not refresh; no local Cloudflare API token or repository Cloudflare Actions credentials were available. The deployed admin probe still returned the legacy route response. Intake remains disabled on the site; the old Worker still needs replacement or route removal. See [launch readiness](../../LAUNCH_READINESS.md).

`pnpm test:qr`, `pnpm test:field-api`, `pnpm test:proof`, `pnpm test:launch`, `pnpm field-api:dry-run`.

The pressure suite executes production SQL against SQLite with mocked external services. It is not a deployed edge test.

- [D1 prepared statements](https://developers.cloudflare.com/d1/worker-api/prepared-statements/)
- [Turnstile server verification](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Publishing protocol](../../submissions/PUBLISHING.md)
