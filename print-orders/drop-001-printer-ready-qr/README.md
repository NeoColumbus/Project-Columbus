# Drop 001 Printer-Ready QR Pack

This is the upload folder for the real QR run.

## Stickers

- `stickers-letter-pdfs/` has one letter-size PDF per sticker.
- `full-city-stickers-qr-letter-all.pdf` has all 8 sticker pages in one PDF.
- Each page contains only an 8x10 sticker centered on the sheet, with its QR built into the artwork.
- Trim at the artwork edge. The surrounding page area is intentionally blank.

## Posters

- `posters-8x10-pdfs/` has one 8x10 PDF per poster.
- `full-city-posters-qr-8x10-all.pdf` has all 8 poster pages in one PDF.
- The PDFs are rendered at 300 DPI for 8x10 printing.
- Use the vector masters in `source-svg/posters/` for larger 4:5 output such as 16x20.

## QR Paths

- Stickers use `source=sticker-001` through `source=sticker-008`.
- Posters use `source=poster-001` through `source=poster-008`.
- `scan-paths.csv` lists every encoded URL.

Regenerate from the repo root with `pnpm generate:printer-ready-pack`.

Scan one proof from each PDF before ordering the full run.
