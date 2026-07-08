# Field Submission API

This is the tiny no-login intake API for the public scan path.

It receives a field card from the static site and opens a GitHub issue for maintainer review.

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

Copy `wrangler.toml.example` to `wrangler.toml`, fill in the worker name, and deploy with Wrangler.

After deploy, set the endpoint in:

- [../../site/config.js](../../site/config.js)

Example:

```js
window.FULL_CITY_CONFIG = {
  fieldSubmissionEndpoint: "https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev/field-report"
};
```

## Turnstile

If `TURNSTILE_SECRET` is set, submissions must include a valid `turnstileToken`.

Leave it unset until the frontend is wired with a Turnstile widget.
