name: process-issue
description: Implements a GitHub issue end-to-end: reads the ticket, creates a branch dedicated to it, implements and tests the change, and opens a PR linked to the issue. Takes a GitHub issue link (or `owner/repo#123` / bare number) as its argument. Use when the user wants an issue/ticket implemented and turned into an open PR, e.g. "work on https://github.com/wrk-tafel/admin/issues/2989" or "implement issue #123".
---

This workflow is fully automated end-to-end (implementation, testing, branch, PR) — never ask the
user to run a command, restart something, or confirm intermediate state yourself. **Never merge the
resulting PR** — the workflow ends at "PR open," same as this repo's other skills
(`process-dependabot`, `cleanup-git`, `process-pr`). Never fix a red check by weakening it (skipping
a test, loosening a lint rule, lowering a Sonar gate, `--no-verify`) — fix the root cause, same
philosophy as `fix-e2e`.

## 1. Resolve the issue

The issue link/number is the skill's first argument. If it's missing, stop and ask for it before
doing anything else — don't guess which issue is meant.

Parse `<owner>/<repo>` and `<number>` out of whatever form was given (full URL, `owner/repo#123`,
or a bare number against the current repo), then pull the full ticket, including comments — scope
often gets clarified in comments, not just the original body:

```bash
gh issue view <number> --repo <owner>/<repo> --json number,title,body,labels,comments,url
```

Check whether an open PR already references this issue before starting fresh:

```bash
gh pr list --repo <owner>/<repo> --state open --search "#<number> in:body"
```

If one exists, tell the user and ask whether to continue that PR instead of opening a new one —
don't silently create a duplicate.

## 2. Sync main

```bash
git status                     # must be clean before switching branches; stash -u or ask if not
git fetch origin main
git checkout main
git pull --ff-only origin main
```

## 3. Create a branch dedicated to the ticket

Many issues in this repo already carry a Conventional-Commits-style title (e.g.
`fix(backend): AsyncRequestNotUsableException from SseOutboxService.sendEvent() escapes its own
catch block`) — reuse that `<type>(<scope>)` when present rather than re-deriving it; otherwise
infer `<type>` from the Conventional Commits type list (`feat`, `fix`, `docs`, `refactor`, `chore`,
...).

Branch name: `<type>/<short-kebab-slug>-<issue-number>` — the issue number is what makes it
unambiguous, so the slug itself just needs to be recognizable, not exhaustive:

```bash
git checkout -b fix/async-request-not-usable-log-noise-2986
```

## 4. Implement

Follow this repo's conventions (module boundaries, DTO `Request`/`Response`/`Item`
suffix rules, Angular signal-based patterns, `@if`/`@for` flow-control syntax, etc.) — read the
relevant module's existing code before writing new code, don't guess at patterns.

- Any new/changed **frontend user-facing behavior** needs an added/updated Cypress e2e case under
  `cypress/e2e/`, not just a Vitest unit spec — a frequent gap.
- Any new/changed **user-facing feature** needs the German user guide (`docs/userguide/`) updated
  in the same task, including screenshots if the UI changed (watch for cursor position, anchors,
  and cross-link rules when editing it).
- If you notice a bug that's **not** caused by this issue: fix it inline only if it's small and
  directly related to the code you're touching; otherwise `gh issue create` a separate ticket and
  mention it to the user — don't silently expand this PR's scope.

## 5. Test locally before pushing

Run the same checks CI will run, so red checks are rare rather than routine:

```bash
./gradlew :backend:test
./gradlew :backend:ktlintCheck
cd frontend/src/main/webapp && npm run lint && npm run typecheck && npm run test-ci && cd -
```

**Skip the test suites entirely for a pure styling/layout change** — one that only touches CSS
classes, colours, spacing, ordering or markup structure and changes no behavior. The suites here
assert functional behavior only, so they cannot confirm or refute a visual change; running them
just burns minutes. Verify such a change by looking at it (see `run`/browser automation) and let
CI cover the rest. This does *not* apply the moment the diff also touches component logic,
bindings, form state or an API — then it's a normal change and gets the full run above.

For larger changes, also run full builds for CI-equivalent confidence: `./gradlew :backend:bootJar`
and `npm run build-prod`.

**Never run the full Cypress suite locally — that is CI's job.** If the change touches a
Cypress-covered flow, run only the affected spec(s) via `--spec`, using the `fix-e2e` skill's
workflow for the backend-restart-with-`e2e`-profile ritual rather than re-deriving that setup here.
A full local run costs many minutes and duplicates what the pipeline already does on every push.

## 6. Commit

Conventional Commits subject, matching the format exactly (lowercase
description, no trailing period, ≤100 char header, valid `type`) — this is enforced by a commit-msg
hook, `commitlint`, and `pr-title-lint` in CI, and has been the recurring miss in this repo.

## 7. Push and open the PR

```bash
git push -u origin <branch>
gh pr create --repo <owner>/<repo> --base main --head <branch> \
  --title "<type>(<scope>): <description>" \
  --body "$(cat <<EOF
## Summary
<what changed and why, referencing the issue>

Closes #<issue-number>

## Test plan
- [x] ./gradlew :backend:test
- [x] npm run lint / typecheck / test-ci
- [ ] CI

🤖 Generated with Claude Code
EOF
)"
```

The PR title itself must pass `pr-title-lint` (same Conventional Commits rule as commits, since this
repo squash-merges with the PR title becoming the final commit). The `Closes
#<issue-number>` line is what auto-closes the issue once the squash commit lands on `main`.

Report the PR URL back to the user. Stop there — this skill's own workflow ends once the PR is
open; it does not review the diff further or babysit CI.
