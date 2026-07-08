# Setup

<!-- HUMAN NOTE: Keep this friendly. A novice should be able to get unstuck here without pretending to be a developer. -->

You do not need a local setup to contribute words, field notes, photos, or source corrections.

You only need local setup if you want to export assets, test the site, or change code.

## Install Once

Install:

- Git
- Node.js LTS
- pnpm

After Node is installed, pnpm can usually be enabled with:

```sh
corepack enable
corepack prepare pnpm@11.7.0 --activate
```

## Get The Repo

```sh
git clone https://github.com/NeoColumbus/Project-Columbus.git
cd Project-Columbus
pnpm install --frozen-lockfile
```

## Export Drop 001

```sh
pnpm export:drop001
```

The export bundle lands in:

```sh
dist/drop-001-second-geometry/
```

`dist/` is ignored by git.

## Preview The Site

From the repo root:

```sh
python -m http.server 8131 -d site
```

Then open:

```txt
http://127.0.0.1:8131/
```

## If A Command Fails

Check:

- `node --version`
- `pnpm --version`
- `git status`

If `pnpm export:drop001` says `node` is missing, Node is not on your PATH.
Install Node.js LTS and reopen the terminal.

## No-Terminal Path

If you do not want any of this:

1. Open the public site.
2. Make a field card.
3. Copy, share, or download it.
4. Bring back one real place.

Scan path:

https://neocolumbus.github.io/Project-Columbus/signal/
