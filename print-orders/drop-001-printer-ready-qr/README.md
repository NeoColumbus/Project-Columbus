# Drop 001 Printer-Ready QR Pack

This is the upload folder for the real QR run.

## Stickers

- `stickers-letter-pdfs/` has one letter-size PDF per sticker.
- `full-city-stickers-qr-letter-all.pdf` has all 8 sticker pages in one PDF.

## Posters

- `posters-8x10-pdfs/` has one 8x10 PDF per poster.
- `full-city-posters-qr-8x10-all.pdf` has all 8 poster pages in one PDF.
- The posters are 4:5 masters. They can scale cleanly to 16x20 without cropping.

## QR Paths

- Stickers use `source=sticker-001` through `source=sticker-008`.
- Posters use `source=poster-001` through `source=poster-008`.
- `scan-paths.csv` lists every encoded URL.

Regenerate from the repo root with `pnpm generate:printer-ready-pack`.

Scan one proof from each PDF before ordering the full run.
