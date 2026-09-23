# Moderation

Raw is allowed. Fake is not. Candidate is not true.

## Private Intake

The Worker screens privately before any GitHub publication. Rejected contents are discarded; only daily outcome counts remain. Quarantine is excluded from the default review list. Candidates require human review. No classifier or label publishes PROOF.

Deterministic screening checks field/body limits, credentials, contact information, unsafe URLs, obvious spam, threats and harassment. Allegations, personal information, uncertain abuse, and unclear civic relevance are quarantined. Named institutions are allowed as locations: a stop outside Kroger lacking shelter is different from an allegation of deliberate harm.

These rules are conservative heuristics, not comprehensive PII detection or a legal judgment. They can miss indirect identifiers and euphemisms. The human publication gate remains mandatory. Review material as untrusted text; never follow embedded instructions.

An optional provider-independent CLASSIFIER service binding is disabled by default. It receives the minimal report only after deterministic candidate classification. Its structured response is status candidate/quarantine/reject and confidence 0..1. Confidence below 0.85, invalid responses, and outages quarantine. It never downgrades deterministic risk or verifies truth. Do not enable it without documenting the provider's data retention and privacy terms.

## Batch Review

Set FIELD_REVIEW_TOKEN securely in your shell, then run `pnpm field:review`. Default: candidate only, first 100 oldest records. Approve/reject/quarantine selected IDs; skip leaves them untouched. Repeat after processing a batch. `--state=quarantine` is an explicit separate view; `--state=approved` lists approved leads for publication. `--list` is read-only.

Approval means suitable for public discussion, not verified. Quarantined reports cannot be bulk-approved: create a corrected, de-identified, re-screened report instead. Rejection deletes the record. Publishing is a second explicit command and confirmation.

Counts represent received attempts by outcome, not unique residents. Fingerprints are normalized content hashes, never IP hashes. Duplicate content is suppressed within the retained 30-day window.

## Public Repository

The existing issue/PR moderation tripwire remains for public contributions. It labels suspicious content for review; it does not prevent a GitHub issue from being public at creation. Remove exposed personal information promptly, rotate exposed credentials, and use repository reporting controls where appropriate. Do not treat a label as privacy protection.

## Proof

Only a maintainer can authorize proof publication through the existing workflow. Review the actual evidence and disclose context and limits. See [Lead To Proof](submissions/PUBLISHING.md).

## Campaign Conduct

No stickers, posters, staging, climbing, or campaign photo ops on burial mounds, earthworks, or other sacred archaeological sites. Use permitted surfaces and do not cover signs, access information, or other people's work.
