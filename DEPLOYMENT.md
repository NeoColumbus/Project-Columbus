# Deployment

Full City Columbus is designed to publish as a static GitHub Pages site from the `site/` folder.

The repo also keeps root-level entry shims for:

- `/`
- `/signal/`
- `/proof/`

Those shims make printed QR paths and README links work even if GitHub Pages is temporarily configured to serve the repository root instead of the Actions-built `site/` artifact.

Expected public URL:

https://neocolumbus.github.io/Project-Columbus/

Canonical public action paths:

https://neocolumbus.github.io/Project-Columbus/signal/

https://neocolumbus.github.io/Project-Columbus/proof/

## How It Works

The workflow at [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml) runs on every push to `main`.

It uploads the `site/` folder as the Pages artifact and deploys it to GitHub Pages.

The workflow at [.github/workflows/export-drop-assets.yml](.github/workflows/export-drop-assets.yml) builds the Drop 001 PNG/PDF artifact when source assets change or when a maintainer runs it manually.

The workflow at [.github/workflows/deploy-field-api.yml](.github/workflows/deploy-field-api.yml) deploys the no-login field submission worker when a maintainer runs it manually.

The workflow at [.github/workflows/publish-proof.yml](.github/workflows/publish-proof.yml) publishes reviewed field report issues to the proof wall when a maintainer labels an issue `publish-proof` or runs the workflow with an issue number.

## First-Time Setup

If GitHub Pages is not enabled yet:

1. Open the repo settings on GitHub.
2. Go to Pages.
3. Set Build and deployment source to GitHub Actions.
4. Re-run the Deploy GitHub Pages workflow or push a new commit.

After that, every push to `main` should update the public site automatically.

If Pages is still serving the branch root, the shims will forward visitors into:

- `/site/`
- `/site/signal/`
- `/site/proof/`

Do not remove the shims unless Pages is confirmed to serve the `site/` artifact and the printed QR path has been retested.

## Static Site Limit

GitHub Pages serves files.
It does not store form submissions.

The current no-login field path creates portable field cards: copy, share, download, or card link.

To accept private submissions without GitHub login, add a public inbox or form backend and document it in [SUBMISSIONS.md](SUBMISSIONS.md).

## Field Submission API

The worker in [api/field-submission](api/field-submission) can receive field cards from the static site and create GitHub issues.

Local checks:

```sh
pnpm run test:field-api
pnpm run field-api:dry-run
```

To activate it:

1. Add repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
2. Run the `Deploy Field Submission API` workflow.
3. Store `GITHUB_TOKEN` as a Cloudflare Worker secret.
4. Optional: create a Cloudflare Turnstile widget, store `TURNSTILE_SECRET` as a worker secret, and set `turnstileSiteKey` in [site/config.js](site/config.js).
5. Set the deployed worker URL in [site/config.js](site/config.js).

Until [site/config.js](site/config.js) has a live `fieldSubmissionEndpoint`, the signal page falls back to copy/share/download.

## Proof Wall Publishing

The proof wall starts clean.
Do not add entries without a checkable field report.

Publishing path:

1. A field card becomes a GitHub issue.
2. A maintainer checks that the place, proof, missing piece, and line are usable.
3. The maintainer adds the `publish-proof` label.
4. GitHub Actions updates [site/proof/proof-data.json](site/proof/proof-data.json) and [submissions/proof-wall.md](submissions/proof-wall.md).
