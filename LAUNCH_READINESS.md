# Launch Readiness / 2026-09-24

The website can receive sticker visitors without claiming a working intake. Public submission remains disabled. An empty proof ledger and unfinished COTA model are honest states, not reasons to invent activity.

## Checks completed locally

- Built Pages routes, internal links and cross-page anchors, social images, custom 404, and direct print PDF files.
- Browser layouts at 320, 390, 768, 1100, and 1440 pixels; mobile menu, skip links, marquee pause/reduced motion, image selection, headings, and horizontal overflow.
- Shipping QR manifest URLs and compatibility fixtures, including all eight public parameters and shared-card hydration. Printed assets were not regenerated.
- Disabled intake, successful mocked private receipt, generic server failure, bounded request timeout, preserved field values, and manual clipboard recovery.
- Private-intake SQL and mocked provider pressure checks; proof publication gates. These are not production verification.

Pages deployment now depends on the reusable launch checks succeeding. The QR and browser suites test the built Pages tree, not just source files.

## Production intake dependency

Update, 2026-09-24: GitHub Actions Cloudflare credentials are now configured. Run 36036709903 deployed the private Worker, D1 migration, managed Turnstile, review secret, edge limiter, and retention cron. Real production probes passed unauthorized review, authenticated counts-only summary, malformed/oversized input, invalid verification, and bounded rate-limit rejection. Invalid probes left the private queue unchanged. The old public-issue intake implementation has been replaced. No genuine verified submission has passed yet; public intake stays disabled. The clearly labeled `/site/intake-check/` page permits a human browser test, not a field observation; check and remove that synthetic record before activation. Scheduled retention execution and human publication credentials still require operational verification.

The following describes the initial access blocker, now resolved through Actions:

The Cloudflare OAuth session is expired. Neither local API-token access nor the repository's Cloudflare Actions secrets is configured. A read-only admin probe returns the legacy route response; a malformed JSON request is rejected. No valid report was sent to the legacy Worker.

The old Worker has NOT been replaced or disabled. Disabling the website button does not disable direct requests to it. Before promotion, an authorized operator must restore access to the owning Cloudflare account, replace/disable that deployment, provision the real D1 binding and migration, and configure the managed Turnstile widget and secrets. See [the activation checklist](api/field-submission/README.md).

Then verify a real Turnstile-verified report enters D1 private review without creating a public issue, invalid verification, edge limits, oversized bodies, unauthorized review, generic failures, and scheduled retention. Only afterward enable `fieldSubmissionEnabled` with the real public site key. Optional AI classification is not required.

## Private queue and notifications

`pnpm field:review --summary` uses `FIELD_REVIEW_TOKEN` and returns only candidate count, quarantine count, and oldest pending date. Its authenticated endpoint is `GET /admin/summary`; report contents are excluded. Counts are queued records, not unique participants or verified claims.

No authorized notification destination/scheduler is configured. The remaining notification setup is to select a private channel and securely schedule this counts-only summary. Do not send report contents or review credentials to public issues, Actions logs, or notification messages.

## Physical check

Browser tests exercise existing QR destinations. A real phone scan is still required when a device is available; it was not performed during this pass.
