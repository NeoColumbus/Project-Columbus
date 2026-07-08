# Submissions

<!-- HUMAN NOTE: This is the honest participation pipe. Do not fake a backend. Static GitHub Pages cannot collect private form submissions by itself. -->

Full City Columbus has two front doors:

- public field cards for people who do not know Git
- the field submission API when the public inbox is configured
- GitHub issues and pull requests for people ready to send material upstream

## No-Login Field Path

Use the public scan path:

https://neocolumbus.github.io/Project-Columbus/signal/

Make a field card.

Then:

- send it to the project if the public inbox is configured
- copy it
- share it
- download it
- copy the card link
- post it publicly with `#FullCityColumbus` and `#SignalSeen`

This is the street path.

## Upstream Path

When the field card is sharp enough, send it upstream through GitHub:

- [field report issue](https://github.com/NeoColumbus/Project-Columbus/issues/new?template=field-report.md&title=%5BField%5D%20)
- pull request against [site/proof/proof-data.json](site/proof/proof-data.json)
- pull request against [submissions/proof-wall.md](submissions/proof-wall.md)

## Proof Wall Publishing

Do not fake momentum.

Checked proof goes in:

- [site/proof/proof-data.json](site/proof/proof-data.json)
- [submissions/proof-wall.md](submissions/proof-wall.md)

Every proof entry needs:

- place
- type
- proof link or field context
- missing piece
- one public line
- status

## Public Inbox API

GitHub Pages is static.
It cannot store form submissions without an outside service.

This repo includes a small worker API:

- [api/field-submission](api/field-submission)

When deployed, it receives no-login field cards and opens GitHub issues for maintainer review.

Until the endpoint is configured in [site/config.js](site/config.js), the public button falls back to copying the field card.
