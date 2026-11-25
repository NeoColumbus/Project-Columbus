# Civic publication edition

The five chapter links now follow the physical reading order. Section numbers follow that order while original section IDs remain available. Work opens with a register and the frozen working paper. The proof ledger precedes founding observations and displays field slots as ruled rows. On the Signal route the notebook follows the introduction, before the campaign action directory.

The November QA pass exercised the built artifact at 320, 390, 768, 1024, 1100 and 1440 pixels. All 44 external link destinations in the primary and utility pages responded successfully to HTTP HEAD requests. This checks reachability. Internal anchor and download checks are in the launch suite.

The homepage chapter index gives readers direct access to the city, research, geography, campaign and participation sections. The existing Columbus skyline edit opens the edition. The poster exhibition opens the original vector artworks at their native resolution.

The [editorial photography reference](https://dribbble.com/shots/27707681-Editorial-Neo-Brutalism-Photography-Website) informed the spacing around photography and display type. The publication uses Archivo Black for declarations, a system sans for reading, and monospace for document labels. Limestone and bone carry research and reporting. River Navy frames the working paper and field controls. The proof archive uses dark green.

Printed links land at the existing form anchor. Campaign context sits beside the notebook on desktop and before its fields on mobile. On narrow screens, supporting review notes follow the controls.

Run the Pages build followed by `node tools/check-redesign-inventory.cjs` to compare the built pages against the previous edition and generate `dist/content-baseline.json`. The comparison requires baseline commit `b180185` locally. Run the QR and launch suites with `PUBLIC_ROOT=dist/pages` for browser checks.
