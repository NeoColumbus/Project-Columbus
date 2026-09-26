# Launch Readiness / 2026-09-25

Private intake is deployed and the public form is configured for activation. The proof wall remains empty; COTA remains in progress. Neither needs invented activity or results.

## Production evidence

- Run 36036709903 deployed the private Worker, D1 migration, managed Turnstile widget, review secret, edge limiter, and retention cron. Unauthorized review, authenticated counts-only summary, malformed/oversized input, invalid verification, and bounded rate-limit probes passed. Rate limits are approximate and per edge, not a globally exact sixth-request guarantee.
- Inspection run 36037871552 confirmed that the user's real-browser Turnstile test reached private quarantine. One synthetic record existed, with no public issue or publication in progress. It was not a field observation or community submission.
- The browser timed out before confirmation. The public form now allows 45 seconds and preserves entered information on failure; retries are grouped by fingerprint.
- Cleanup run 36213501873 removed exactly one matching synthetic, quarantined, unpublished record and confirmed zero candidates, zero quarantine records, and no oldest pending date. The technical test page is closed.
- The legacy public-issue intake is replaced. Keep that backend change on rollback. Disabling the website alone is not a backend kill switch.

## Local and CI checks

Built Pages routes, internal links/anchors, print PDFs, social images, custom 404, QR hydration/shared links, proof gates, and layouts at 320/390/768/1100/1440 pixels are covered. Both enabled and disabled submission states are tested without sending test-runner reports to production. Timeout, generic failure, and manual clipboard recovery tests preserve entered data.

Pages deployment depends on those checks. Local SQLite/provider mocks are not production evidence; the production runs above are recorded separately. Printed assets were not regenerated.

## Review and follow-ups

The **Inspect Private Intake** workflow returns only counts/status and oldest pending date. Cleanup is opt-in and restricted to the exact synthetic deployment record. No report content appears in workflow logs.

No notification channel/schedule is configured. Select an authorized private destination before promising alerts; send counts/status only. For local batch review, configure a dedicated 32+ character `FIELD_REVIEW_TOKEN` repository secret and use that same value privately with the review CLI. Until then, the deployment workflow derives a domain-separated review credential from its Cloudflare token, never printed. Cloudflare D1 remains accessible to authorized account maintainers.

The retention cron is deployed and its SQL has local test coverage; actual scheduled execution still needs operational observation. Human-approved GitHub publication credentials and the complete publication workflow still need an operational check before use. These do not authorize automatic proof or public exposure of leads.

A physical printed-QR scan was not independently repeated during this pass. Existing shipping URLs passed browser regression tests, and the user performed the genuine mobile submission test described above.
