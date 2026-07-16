# Street Kit

<!-- HUMAN NOTE: This folder is for printable public artifacts. These should be easy to steal, remix, and make sharper. -->

## Drop 001 Poster Set

Evidence posters:

- [001-earthworks-were-first.svg](posters/001-earthworks-were-first.svg)
- [001-earthworks-were-first-qr.svg](posters/001-earthworks-were-first-qr.svg)
- [002-signal-seen-confluence.svg](posters/002-signal-seen-confluence.svg)
- [002-signal-seen-confluence-qr.svg](posters/002-signal-seen-confluence-qr.svg)
- [003-center-before-seal.svg](posters/003-center-before-seal.svg)
- [003-center-before-seal-qr.svg](posters/003-center-before-seal-qr.svg)
- [004-pile-of-projects.svg](posters/004-pile-of-projects.svg)
- [004-pile-of-projects-qr.svg](posters/004-pile-of-projects-qr.svg)
- [005-machine-pays-tribute.svg](posters/005-machine-pays-tribute.svg)
- [005-machine-pays-tribute-qr.svg](posters/005-machine-pays-tribute-qr.svg)
- [006-report-dead-wall.svg](posters/006-report-dead-wall.svg)
- [006-report-dead-wall-qr.svg](posters/006-report-dead-wall-qr.svg)
- [007-cota-nervous-system.svg](posters/007-cota-nervous-system.svg)
- [007-cota-nervous-system-qr.svg](posters/007-cota-nervous-system-qr.svg)
- [008-no-more-half-city.svg](posters/008-no-more-half-city.svg)
- [008-no-more-half-city-qr.svg](posters/008-no-more-half-city-qr.svg)

Companion artifacts:

- [sticker-sheet.svg](sticker-sheet.svg)
- [sticker-sheet-qr.svg](sticker-sheet-qr.svg)
- [sticker-sheet-letter.svg](sticker-sheet-letter.svg)
- [signal-sticker-sheet.svg](signal-sticker-sheet.svg)
- [qr-utility-sheet.svg](qr-utility-sheet.svg)
- [hero-sticker.svg](hero-sticker.svg)
- [qr-sticker.svg](qr-sticker.svg)
- [handbill-post-the-signal.svg](handbill-post-the-signal.svg)

Campaign QR target:

https://neocolumbus.github.io/Project-Columbus/site/signal/

Each printed artifact carries a source-tagged QR so field reports show which object pulled them in:

- `qr-sticker.svg` -> `?source=sticker`
- `sticker-sheet-qr.svg` -> `?source=sticker-sheet`
- `*-qr.svg` poster files -> `?source=poster-###` plus poster-specific field-card presets
- `handbill-post-the-signal.svg` -> `?source=handbill`

The signal page reads `source` and includes it in the GitHub issue, so the proof queue shows which print run is working. Standalone QR posters also carry `kind`, `break`, and `line` so the field card opens in the right lane.

QR-bearing assets should be regenerated from [../brand/project-qr.svg](../brand/project-qr.svg) and inline the QR path before export. QR poster variants and sticker sheets also inline poster SVG content directly because GitHub blocks nested SVG resource loads inside rendered SVG files.

Regenerate the complete QR and sticker-sheet source set with:

`pnpm generate:qr-assets`

Regenerate only the poster-inlined sticker sheets with:

`pnpm generate:sticker-sheets`

## Print Notes

Print the large poster sticker sheets at native size (about 16.7 x 28.5 inches) so each mini QR lands near 1.2 inches wide. If you need normal home printing, use [sticker-sheet-letter.svg](sticker-sheet-letter.svg); it is built for fewer, bigger stickers on letter paper.

Use [qr-utility-sheet.svg](qr-utility-sheet.svg) when the poster should stay clean and the scan code can live beside it.

These are SVG source files, sized as digital poster masters. Export to PDF or PNG before sending to print.

Use cheap paper first.
Test from across the room.
If the line cannot survive distance, rewrite it.

## Street Law

Signal first.
One line.
One demand.
One place for people to go next.
When the object is meant to travel, give it a scan path.

Never make the poster explain the whole project.

## Field Protocol

Do:

- test the QR before anything leaves your hand
- photograph the object after it lands
- note the exact place
- keep faces, license plates, and private homes out of proof unless there is consent
- use tape, wheatpaste, stickers, or handouts only where you are allowed to use them
- ask permission on private property
- leave the place cleaner than you found it
- remove or replace failed prints

Do not:

- cover traffic signs, transit notices, safety warnings, memorials, public art, or small-business signs
- damage glass, stone, brick, paint, transit shelters, or civic infrastructure
- pretend the project is official city communication
- tag sacred, ceremonial, cemetery, school, hospital, or emergency-service space
- use someone else's photo, art, or logo without rights
- fake a crowd, fake proof, or fake local support

Proof standard:

- real place
- real missing piece
- one line
- proof link or photo context
- status: submitted, checked, published, cut
