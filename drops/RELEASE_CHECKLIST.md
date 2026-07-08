# Release Checklist

<!-- HUMAN NOTE: This is for shipping drops without losing the force. Keep it practical. -->

Every drop should leave the repo as something people can use.

## Drop Requirements

- Symbol
- Line
- Civic demand
- Printable object
- Social object
- Scan path
- Source trail
- Proof path

## Public Package

Each release should include:

- poster SVG
- poster PNG
- printable PDF
- social square
- story frame
- sticker or badge
- caption copy
- issue link or submission path
- source notes

For Drop 001, generate the working export bundle with:

`pnpm export:drop001`

## QA

Before release:

- render desktop and mobile site views
- check for text overflow
- check poster collisions
- check small text
- scan every QR
- test links
- check image credits
- check historical claims
- check borrowed assets
- check AI disclosure if needed
- check the public action is obvious

## Street Test

A drop should answer:

- Can somebody understand the object in three seconds?
- Can somebody act from a phone?
- Can somebody print it cheap?
- Can somebody localize it without asking permission?
- Can somebody submit proof back?
- Can the line survive being repeated by strangers?

## Release Naming

Use this pattern:

`drop-###-short-name`

Examples:

- `drop-001-second-geometry`
- `drop-002-no-more-half-city`
- `drop-003-cota-nervous-system`
- `drop-004-ai-civic-dividend`

## After Release

Track:

- scans
- downloads
- field reports
- first-time contributors
- corrections
- remixes
- print failures
- dead links
- assets people actually used

Then cut what did not move.
