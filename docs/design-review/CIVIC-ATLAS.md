# Full City / civic atlas edition

Baseline: production merge 1410d89. The first screen now leads into three paths. The paper leads the research index, the confluence introduces the geographic register, and the poster reader links each design to its corresponding print PDF. Local card creation and private submission have separate explanations. The chapter order, numbered sections and printed destinations are retained.

## Review the renders

| | Previous | Revised |
|---|---|---|
| Phone, opening and chapters | [390](atlas-Before-390.webp) | [390](atlas-After-390.webp) |
| Desktop, opening and chapters | [1440](atlas-Before-1440.webp) | [1440](atlas-After-1440.webp) |
| Full-page phone | [Previous](full-Before-390.webp) | [Revised](full-After-390.webp) |
| Full-page desktop | [Previous](full-Before-1440.webp) | [Revised](full-After-1440.webp) |

[Filtered ledger, artwork inspection and transit notebook](atlas-interactions.webp). Full-resolution captures are in the local CivicAtlasBefore and CivicAtlasAfter review folders.

## Reference decisions

| Reference | Application |
|---|---|
| [Neutra VDL](https://www.awwwards.com/sites/neutra-vdl) | Balance the short masthead against an open photographic field. |
| [RVTA](https://dribbble.com/shots/21677268-RVTA-Brand-Concept) | Keep destination names legible beside a consistent marker. Text reference; the browser render returned a challenge. |
| [Canadian Centre for Architecture](https://www.cca.qc.ca/en) | Give the opening declaration its own picture plane; move supporting slogans into chapters. |
| [The Architectural Review](https://www.architectural-review.com/) | Establish a compact edition index above a publication with multiple reading paths. |
| [Public Domain Review](https://publicdomainreview.org/) | Couple individual artifacts to captions, files and provenance. |
| [Cooper Hewitt](https://www.cooperhewitt.org/) | Group practical destinations by visitor intent. |
| [Walker Art Center](https://walkerart.org/) | Let the image and headline share the opening spread; give research its own entrance. |
| [Rijksmuseum](https://www.rijksmuseum.nl/en) | Keep the featured work larger than secondary browsing plates. |

## Visual assessment

Editorial self-assessment based on the chapter and interaction renders. Weighted scores are 7.3 before and 8.05 after.

| Dimension | Before / after | Evidence and remaining limitation |
|---|---|---|
| Art direction | 8 / 8 | Skyline, signal geometry and original plates carry the identity. Photography remains concentrated downtown. |
| Typography | 7 / 8 | The opening gives one headline priority. Some chapter titles still take several mobile lines. |
| Hierarchy | 7 / 8 | The COTA paper now opens the receipts grid. Table-level findings need the full article. |
| Pacing | 6 / 7 | Hero-to-index transition is shorter. Seventeen sections still make a long phone read. |
| Brand coherence | 9 / 9 | The river drawing, print reader and existing flag share the palette. |
| Mobile | 7 / 8 | Large intent links and a short notebook path; the schematic takes space above the street entries. |
| Interaction | 7 / 8 | Keyboard-operable filter, chapter state, viewer and file links. Touch validation used browser emulation. |
| Functional clarity | 7 / 9 | The form distinguishes configuration loading, disabled intake, sending and receipt. |

## Engineering evidence

Local built artifact, Chromium. Content inventory covers seven public pages. QR regression covers 26 shipping/legacy examples. Launch suite exercises navigation, anchors, gallery keyboard and focus, geographic filters, clipboard and downloads, configured/disabled intake, checking, pending request, success, failure, timeout and JavaScript-off fallback. Worker pressure, publication, deployment and monitor tests use isolated fixtures. Production Worker OPTIONS returned 204.

Local mobile Lighthouse against the homepage on loopback: performance 96, accessibility 100, best practices 100, SEO 92. Earlier iteration: 83, 96, 100, 92. These are single lab runs. Axe WCAG A/AA scan at 390px returned zero violations on Home, Work, Signal and Proof. Physical phone, assistive-technology user testing and production submission were outside the checks performed.
