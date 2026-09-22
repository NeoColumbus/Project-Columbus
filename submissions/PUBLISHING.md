# Lead To Proof

The loop is SIGNAL -> RECEIPTS -> FIELD -> PROOF -> RETURN.

## LEAD

Place + missing piece/claim + public line. Evidence can be absent. All public intake begins here; attaching a URL does not establish truth. Leads live in the issue queue, not on the proof wall. The issue queue is public: do not include private information.

## PROOF

A maintainer checks the place, claim, line, and a public HTTP(S) evidence link. Evidence can be a photograph, post, document, or a maintainer-added record with its provenance disclosed. Confirm that the link actually supports the claim and can be checked without private access. Automation checks structure, not truth.

1. Correct the issue's Place, What Is Missing, Line, and Proof fields as needed. Add evidence to the Proof section if the original submission lacked it. Record the check and any limitations in an issue comment.
2. Only after checking, apply `publish-proof` or run the Publish Proof Wall Entry workflow manually. The workflow verifies the actor has repository write/maintain/admin permission.
3. The publisher requires a public evidence URL and `PROOF_REVIEWER` (set from the authenticated workflow actor). It records `checkedBy`, `checkedAt`, and `status: published`.
4. The wall renders only published records with check metadata and evidence. Correct or withdraw a record via a reviewed change to `site/proof/proof-data.json` and `submissions/proof-wall.md`.

For local publication testing, set `PROOF_REVIEWER` explicitly and use temporary output paths. Never represent fixture records as participation. Workflow execution is the production authorization boundary; a local environment variable is not authentication.

Founding observations are project document research and remain separate from community field proof. Aggregate counts may describe submitted reports, checked proof, and source assets; they must not imply unique people or track visitors.
