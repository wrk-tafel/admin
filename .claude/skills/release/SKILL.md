name: release
description: Prepares and triggers a production release by merging `main` into the `release` branch, which drives release.yml (build, test, sonar, lint, e2e, Docker images tagged `test`+`latest`+semver, GitHub release, deploy to test and prod). Use when the user wants to release, deploy, ship, or cut a new version of wrk-tafel/admin.
---

Goal: get everything currently on `main` out to production, with the correct semantic-version bump
landing on the `release` branch's squash commit — then hand off for the user to merge. Merging is
what actually triggers the prod deploy, so never do that without an explicit go-ahead in this
conversation.

## 1. Sync and see what would actually ship

```bash
git fetch origin main release
git log origin/release..origin/main --oneline
```

If this is empty, tell the user `release` is already up to date with `main` and stop — there is
nothing to release.

## 2. Determine the version bump from Conventional Commit types

`release.yml`'s `version` job (`paulhatch/semantic-version`) derives the next tag from the commit
type of **the single squash commit that lands on `release`** — which is this PR's title, per
CONTRIBUTING.md. So the PR title's type must reflect the highest-impact change being shipped:

- Any commit with `!` after the type/scope, or a `BREAKING CHANGE:` footer → major → title gets
  `!`, e.g. `feat!: ...` / `fix!: ...`
- Else any `feat:` commit in the list → minor → title starts with `feat:`
- Else → patch → title starts with `fix:` (or `chore:` if nothing user-facing changed)

Read through the commits from step 1 to classify them rather than grepping blindly — a `feat:`
commit that only touches internal tooling still counts as `feat` for this rule (the
semantic-version job doesn't discriminate on scope).

## 3. Open the release PR — do not merge it yet

```bash
gh pr create --base release --head main \
  --title "<type>: release recent changes" \
  --body "<bulleted list of the commits from step 1, PR numbers where available>"
```

Follow the existing naming precedent (`gh pr list --base release --state merged --limit 10` shows
things like `fix: release recent changes`) — keep the body short, this PR's job is to carry the
right squash type, not to re-explain every change.

## 4. Confirm before merging

Merging this PR pushes to `release`, which immediately kicks off `release.yml`: full
build+test+e2e, Docker images tagged `test`/`latest`/`<version>`, a GitHub release, and —
critically — SSH deploys to **both the test and prod environments**. This is exactly the kind of
hard-to-reverse, shared-impact action that needs an explicit go-ahead: report the PR link, the
commits it carries, and the version bump it will produce, then stop and wait for the user to say
to merge it. Do not merge automatically, even if everything else in this workflow ran cleanly.

## 5. If the user confirms: merge and watch

```bash
gh pr merge <number> --squash --subject "<the confirmed title>"
gh run watch --exit-status $(gh run list --workflow=release.yml --branch release --limit 1 --json databaseId --jq '.[0].databaseId')
```

Report the run URL and final conclusion (success/failure). If it fails, do not retry or force
anything — surface the failing job/step and let the user decide next steps, since this pipeline
touches prod.

**Never:**
- push directly to `release` (always go through a PR, so CI title-lints it and there's a review
  point before prod is touched)
- merge the release PR without the user's explicit go-ahead in this conversation
- retry a failed release deploy automatically
