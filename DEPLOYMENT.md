# Deployment

Full City Columbus is designed to publish as a static GitHub Pages site from the `site/` folder.

Expected public URL:

https://neocolumbus.github.io/Project-Columbus/

## How It Works

The workflow at [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml) runs on every push to `main`.

It uploads the `site/` folder as the Pages artifact and deploys it to GitHub Pages.

The workflow at [.github/workflows/export-drop-assets.yml](.github/workflows/export-drop-assets.yml) builds the Drop 001 PNG/PDF artifact when source assets change or when a maintainer runs it manually.

## First-Time Setup

If GitHub Pages is not enabled yet:

1. Open the repo settings on GitHub.
2. Go to Pages.
3. Set Build and deployment source to GitHub Actions.
4. Re-run the Deploy GitHub Pages workflow or push a new commit.

After that, every push to `main` should update the public site automatically.

## Static Site Limit

GitHub Pages serves files.
It does not store form submissions.

The current no-login field path creates portable field cards: copy, share, download, or card link.

To accept private submissions without GitHub login, add a public inbox or form backend and document it in [SUBMISSIONS.md](SUBMISSIONS.md).
