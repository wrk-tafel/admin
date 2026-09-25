---
name: release
description: Releases what is on `main` by pushing it straight to the `release` branch, which drives release.yml (build, test, sonar, lint, e2e, Docker images tagged `test`+`latest`+semver, GitHub release, deploy to test and prod). Use when the user wants to release, deploy, ship, or cut a new version of wrk-tafel/admin.
---

Goal: get everything currently on `main` out to production. `release` only ever moves forward to a
commit that is already on `main`, so a release is a fast-forward push - no release PR, no merge
commit. Invoking this skill is the go-ahead for that push; everything before it is a check that
can stop the release, and nothing after it is retried.

The next version is derived by `release.yml`'s `version` job (`paulhatch/semantic-version`) from the
Conventional Commit types of the commits on `release` since the last tag (`feat` → minor, `!` /
`BREAKING CHANGE:` → major, anything else → patch), so there is nothing to compute or to name here.

`release` is a protected branch (one approving review) that admins may push to - which is what this
relies on. If the push is rejected with a protection error, stop and tell the user; do not work
around it and never force-push.

## 1. Sync and see what would actually ship

```bash
git fetch origin main release --tags
git log origin/release..origin/main --oneline
```

If this is empty, tell the user `release` is already up to date with `main` and stop — there is
nothing to release.

Then check that this is a fast-forward:

```bash
git merge-base --is-ancestor origin/release origin/main && echo fast-forward
```

If it is not (something landed on `release` that `main` does not have), stop and report it — that is
a state to look at, not to overwrite.

## 2. Check that main is fit to ship

- **`main` is green.** The pipeline on the exact commit being released must have succeeded, since
  `release.yml` rebuilds and re-tests but a red `main` would only surface after prod is involved:
  ```bash
  gh run list --branch main --workflow main_push.yml --limit 3 --json databaseId,headSha,status,conclusion,displayTitle
  ```
  Find the run whose `headSha` is `origin/main`'s. If it is still running, wait for it
  (`gh run watch --exit-status <id>`); if it failed, or there is none, stop and report which.
  A path-aware run whose jobs were *skipped* (docs-only change) is fine.
- **It is not Saturday** in Europe/Vienna. `deploy-prod` refuses to run then (the app is live during
  Saturday distributions and Flyway migrations run on boot), so the release would go out to test and
  fail its `check-deploy-window` job. `TZ=Europe/Vienna date +%A` tells. If it is Saturday, say so and
  stop - unless the user explicitly wants test/dev only, which this skill does not distinguish.
- **`CHANGELOG.md`'s `## [Unreleased]` is not stale** - it feeds the release notes only through the
  added `- ` lines since the previous tag, so nothing breaks, but mention it to the user if the
  heading still holds bullets of an earlier release (see CLAUDE.md's "Changelog" section).

## 3. Push

```bash
git push origin origin/main:release
```

This is a plain fast-forward: no `--force`, no `--force-with-lease`. It immediately starts
`release.yml`: full build+test+e2e, Docker images tagged `test`/`latest`/`<version>`, a GitHub
release, and SSH deploys to **the test and the prod environment**. That is the point of the skill, and
also why steps 1 and 2 stop instead of pushing anyway.

## 4. Watch

```bash
gh run list --workflow=release.yml --branch release --limit 1 --json databaseId,url
gh run watch --exit-status <databaseId>
```

Report the commits that shipped (step 1's list), the version that was tagged (`gh release list --limit 1`),
the run URL and the final conclusion. If it fails, do not retry or re-push anything — surface the failing
job/step and let the user decide, since this pipeline touches prod. A red run whose only failure is
`check-deploy-window` is the Saturday freeze, not a broken build: everything up to `deploy-test` succeeded and prod
is deployed by re-running the failed jobs once it is no longer Saturday.

**Never:**
- force-push `release`, or push anything to it that is not already on `main`
- release a `main` commit whose pipeline is red or missing
- retry a failed release deploy automatically
