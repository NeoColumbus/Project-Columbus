# Field Submissions

## Private First

The permanent [signal page](https://neocolumbus.github.io/Project-Columbus/site/signal/) still makes, copies, downloads, and shares field cards. All existing printed source parameters remain supported.

Private inbox activation is pending Cloudflare configuration. Until then, save a card. The website does not send it to the legacy public-issue endpoint. Do not post private material to GitHub as a workaround.

When enabled, reports enter private D1 screening. Nothing becomes a public issue at intake. A report needs a place, missing piece, and one line. An evidence URL is optional: a useful lead need not have a hosted photograph.

## What To Send

Name physical conditions: a shelter, crossing, frontage, bench, connection, or public room. A business may identify a location. Do not include personal contact details, private residential information, secrets, threats, or allegations about people. Reports with risk or uncertainty are rejected or quarantined, not published automatically.

Evidence URLs must be public HTTP(S). They are not fetched by intake and do not establish truth. Keep faces, license plates, private details, and unrelated people out of evidence.

## What Happens

1. Turnstile and edge rate limits guard intake.
2. Deterministic screening rejects unsafe material or assigns quarantine/candidate.
3. Optional classification can escalate risk, never establish truth.
4. A maintainer reviews candidates in batches. Approval is still private.
5. An explicit publish action creates a public LEAD. A separate human evidence check is required for PROOF.

Copies of identical content increment a duplicate counter, not a count of supporters or people. Reports retain only civic fields, source codes, screening state, and review/publication metadata. No visitor IP, token, full scan URL, or raw field-card dump is stored. Private records expire after 30 days via a scheduled cleanup; provider backups may have their own retention.

Sharing a card yourself is a separate public action. Anyone with a shared URL can read its query parameters. Do not put secrets into the card.

## Review And Corrections

[Moderation](MODERATION.md) describes screening limits. [Publishing](submissions/PUBLISHING.md) describes the human proof gate. [Deployment](api/field-submission/README.md) lists the activation prerequisites.

GitHub is for public source corrections and already-approved leads, not a private inbox. Public repository issues cannot be made confidential by an automated label.
