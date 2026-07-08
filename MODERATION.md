# Moderation

<!-- HUMAN NOTE: Keep the edge open and the merge button disciplined. This project should not become a sterile hall monitor, but it also cannot become a dump. -->

Raw is allowed.
Fake is not.

Heat is allowed.
Spam, slurs, stolen assets, leaked secrets, bot movement, and low-effort garbage are not.

The project should be porous at the front door and disciplined at `main`.

## The Rule

Let ideas arrive rough.
Do not let trash merge.

Issues, field reports, sketches, slogans, and first drafts can be messy.

The public repo can hold rough material.
The public signal cannot be fake, stolen, sloppy, or unusable.

## How The Tripwire Works

The moderation workflow labels risky content for human review.

It does not:

- delete comments
- close issues
- reject pull requests
- censor raw civic language
- decide taste

It only adds labels such as:

- `needs-review`
- `moderation-tripwire`
- `spam-risk`
- `credential-risk`
- `bot-dump-risk`
- `asset-rights-risk`
- `source-review`

A maintainer still decides.

## What Gets Flagged

Default tripwires watch for:

- obvious spam or promo patterns
- possible leaked keys, passwords, or private credentials
- giant low-effort text dumps
- obvious AI filler
- new image/video/PDF assets that need rights review
- research, policy, canon, or campaign edits that need source review

The workflow does not try to police ordinary profanity.

## Hard Blocklist

Keep the hard blocklist out of the repo.

If maintainers want a private slur/spam regex, add a repository variable:

`MODERATION_TRIPWIRE_REGEX`

GitHub path:

`Settings -> Secrets and variables -> Actions -> Variables`

Example shape:

`term_one|term_two|pattern_three`

Do not use this to flatten the voice.
Use it for content the project never wants to publish.

## Protect Main

This part cannot be fully committed as a file. It has to be turned on in GitHub settings.

Recommended branch rule for `main`:

- require a pull request before merging
- require at least one approval
- dismiss stale approvals when new commits are pushed
- require conversation resolution before merging
- restrict force pushes
- restrict deletions

When maintainers exist, turn on CODEOWNERS review.

## CODEOWNERS

The starter CODEOWNERS file is intentionally inactive until there is a real GitHub user or team with write access.

When ready, replace the commented examples with real owners:

- `@username`
- `@NeoColumbus/team-name`

Do not invent a team name and assume GitHub will enforce it.

## Human Standard

Close or reject:

- fake official affiliation
- fake local support
- bot accounts
- stolen assets
- leaked secrets
- harassment
- unsourced factual claims presented as certainty
- visual assets that fail the collision/readability test
- generic civic filler with no place, demand, or proof

Keep:

- rough first drafts
- sharp language
- weird ideas with force
- field reports from real places
- corrections
- local detail
- beautiful objects people want to carry

The edge can be loud.
The merge button has to be awake.
