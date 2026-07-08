# Branch Protection Setup

This cannot be fully enforced by committing files.
GitHub repo settings have to be changed by an admin.

## Main Rule

For `main`, enable:

- require a pull request before merging
- require at least one approval
- dismiss stale approvals when new commits are pushed
- require conversation resolution before merging
- block force pushes
- block deletions

## When Maintainers Exist

Then enable:

- require review from Code Owners

After that, activate [.github/CODEOWNERS](CODEOWNERS) by replacing the commented examples with real GitHub users or teams that have write access.

Do not invent a CODEOWNERS team name.
GitHub will not enforce a team that does not exist.
