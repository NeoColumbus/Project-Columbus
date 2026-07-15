# Drop 001 Release Bundle

Drop 001 ships as source first and export bundle second.

The source files are the truth.
The export bundle is what people print, post, and hand around.

## Export

From the repo root:

```bash
pnpm export:drop001
```

The script writes PNG and PDF files to:

`dist/drop-001-second-geometry/`

`dist/` is intentionally ignored by git.

The export script uses the repo dev dependencies in [package.json](../../package.json).

Maintainers can also run the `Export Drop Assets` GitHub Action and download the generated artifact.

## Public Package

Drop 001 should leave the repo with:

- poster PNGs
- poster PDFs
- standalone QR poster PNGs
- standalone QR poster PDFs
- sticker-sheet PNGs
- sticker-sheet PDFs
- letter sticker sheet PNG/PDF
- signal sticker sheet PNG/PDF
- QR utility sheet PNG/PDF
- QR sticker PNG/PDF
- handbill PNG/PDF
- flag PNG/PDF
- social square PNGs
- story PNGs
- source SVG links
- scan path
- proof wall path

## QA Before Release

- scan the QR from the rendered PNG and PDF
- check poster text collisions at phone size and across the room
- check sticker QR quiet zones
- check small footer text
- check image credits and licenses
- check public links
- cut anything that feels like filler

## Paths

Scan:

https://neocolumbus.github.io/Project-Columbus/site/signal/

Proof:

https://neocolumbus.github.io/Project-Columbus/proof/
