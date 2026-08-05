name: process-pr
description: Takes over an already-open pull request end-to-end without any ticket involved — checks out its branch, reviews the diff itself for correctness/convention errors and fixes what it finds, then watches CI and SonarCloud until every check is green. Takes a PR link (or `owner/repo#123` / bare number) as its argument. Use when the user wants an existing PR/MR reviewed and made green, e.g. "process PR #2994" or "check https://github.com/wrk-tafel/admin/pull/2994 for errors and get it passing". Also used internally by `process-issue` once it opens its PR, so the pipeline/SonarCloud diagnosis logic lives in one place.
---

This workflow is fully automated end-to-end (review, fixes, CI babysitting) — never ask the user to
run a command, restart something, or confirm intermediate state yourself. **Never merge the PR** —
the workflow ends at "reviewed, all checks green," same as this repo's other skills
(`process-issue`, `process-dependabot`, `cleanup-git`). Never fix a red check by weakening it
(skipping a test, loosening a lint rule, lowering a Sonar gate, `--no-verify`) — fix the root cause,
same philosophy as `fix-e2e`.

Unlike `process-issue`, there is no ticket here: the PR is the entire brief. Don't invent scope
beyond what the diff already does — this skill reviews and repairs the existing change, it doesn't
extend it.

## 1. Resolve the PR

The PR link/number is this skill's first argument. If it's missing, stop and ask for it before
doing anything else — don't guess which PR is meant.

Parse `<owner>/<repo>` and `<number>` out of whatever form was given (full URL, `owner/repo#123`,
or a bare number against the current repo), then pull the full PR, including its diff:

```bash
gh pr view <number> --repo <owner>/<repo> --json number,title,body,state,baseRefName,headRefName,url
gh pr diff <number> --repo <owner>/<repo>
```

If it's not `OPEN` (already merged/closed), tell the user and stop — nothing to process.

## 2. Check out the branch

```bash
git status                     # must be clean; stash -u or ask if not
gh pr checkout <number> --repo <owner>/<repo>
```

`gh pr checkout` handles both same-repo and fork branches correctly, so prefer it over manually
tracking the remote ref.

## 3. Review the diff for errors

Read the changed files in full (not just the diff hunks — surrounding context matters), and check
against this repo's conventions (module boundaries, DTO `Request`/`Response`/`Item` suffix rules,
Angular signal-based patterns, `@if`/`@for` flow-control syntax, Commit Conventions, etc.):

- **Correctness**: logic bugs, off-by-one errors, unhandled null/error cases, race conditions,
  broken edge cases — anything that would misbehave at runtime.
- **Test coverage**: any new/changed **frontend user-facing behavior** needs an added/updated
  Cypress e2e case under `cypress/e2e/`, not just a Vitest unit spec — a frequent gap. Any
  new/changed **user-facing feature** needs the German user guide
  (`docs/userguide/`) updated in the same PR, screenshots included if the UI changed.
- **Security**: injection, auth/authorization gaps, secrets in code — same OWASP-top-10 bar as any
  other change in this repo.
- **Convention drift**: anything that doesn't match this module's existing patterns.

Fix what you find directly on this branch, as focused commits — don't restructure or refactor code
the PR didn't already touch. If you find a bug that's clearly unrelated to this PR's own change
(pre-existing, not introduced by this diff), don't fix it here: `gh issue create` a separate ticket
and mention it to the user instead of expanding this PR's scope.

## 4. Test locally

Run the same checks CI will run, so any additional red check is a surprise rather than routine:

```bash
./gradlew :backend:test
./gradlew :backend:ktlintCheck
cd frontend/src/main/webapp && npm run lint && npm run typecheck && npm run test-ci && cd -
```

For larger fixes, also run full builds for CI-equivalent confidence: `./gradlew :backend:bootJar`
and `npm run build-prod`. If the change touches any flow covered by Cypress, verify it end-to-end
using the `fix-e2e` skill's workflow rather than re-deriving that setup here.

## 5. Commit and push any fixes

Conventional Commits subject (this is enforced by a commit-msg
hook, `commitlint`, and `pr-title-lint` in CI). If step 3 found nothing to fix, skip straight to
step 6 — don't invent a no-op commit.

```bash
git push origin <headRefName>
```

## 6. Wait for the pipeline

```bash
gh pr checks <number> --repo <owner>/<repo> --watch --fail-fast=false
```

This blocks until every job on the PR — `commitlint`, `pr-title-lint`, `build` (backend+frontend),
`test` (backend+frontend), `sonar` / `SonarCloud Code Analysis`, `lint` (backend/docker/frontend),
`build-push-image`, `e2e-test`, `deploy-dev` — has finished, then reports pass/fail per job.
`deploy-dev` shares one `dev-environment` concurrency group across every PR in the repo, so it can
sit queued behind another PR's deploy rather than fail — that's expected, not a problem to fix.

## 7. Investigate and fix any red check

Pull the actual failing log rather than guessing from the job name alone:

```bash
gh run view <run-id> --repo <owner>/<repo> --log-failed
```

(`<run-id>` is in the `gh pr checks` output, or `gh run list --repo <owner>/<repo> --branch
<branch>`.)

Map the failure to a root-cause fix:

- **`commitlint` / `pr-title-lint`**: reword the offending commit subject or PR title to match
  Conventional Commits.
- **`build-backend` / `build-frontend`**: a real compile error — fix the source.
- **`test-backend` / `test-frontend`**: fix the code the test caught; only touch the test itself if
  it's asserting the wrong thing.
- **`lint-backend`** (ktlintCheck) / **`lint-frontend`** (eslint + typecheck) / **`lint-docker`**
  (hadolint): fix the flagged code or Dockerfile.
- **`sonar / sonar`** (the analysis job itself failed, e.g. gradle task error): read its log like any
  other job — `gh run view <run-id> --repo <owner>/<repo> --log-failed`.
- **`SonarCloud Code Analysis`** (the quality gate check): its log link only shows that the gate
  failed, not which conditions or issues caused it — query the SonarCloud API directly instead of
  guessing from the dashboard (the `wrk-tafel-admin` project is public, so no token is needed):

  ```bash
  # which quality-gate conditions failed (coverage, duplications, new bugs/vulnerabilities/smells, ...)
  curl -s "https://sonarcloud.io/api/qualitygates/project_status?projectKey=wrk-tafel-admin&pullRequest=<pr-number>" | jq '.projectStatus.conditions[] | select(.status != "OK")'

  # the specific new issues raised on this PR, with file/line detail
  curl -s "https://sonarcloud.io/api/issues/search?componentKeys=wrk-tafel-admin&pullRequest=<pr-number>&resolved=false&ps=100" | jq '.issues[] | {rule, severity, component, line, message}'
  ```

  Fix each flagged issue at its file/line, or add the missing test for a coverage condition —
  never lower the gate or suppress/`@SuppressWarnings` an issue away without addressing the root
  cause.
- **`e2e-test`**: use the `fix-e2e` skill's diagnosis approach — root-cause fix in the app source,
  never the spec, unless the spec is genuinely wrong.
- **`deploy-dev`**: usually infrastructure (SSH secrets, environment state), not something a code
  change can fix. If the log points at infra rather than the app, stop and report it to the user
  instead of guessing at a code change.

## 8. Push the fix and re-wait

Commit the fix, push to the same branch (this re-triggers the PR's checks), then repeat step 6.
Loop steps 6–8 until `gh pr checks` reports every job green.

## 9. Report

Reply with the PR URL, a one-line summary of what the review found and fixed (or "no issues found"
if step 3 turned up nothing), and confirmation that every check is green. Stop there — the user
reviews and merges manually.
