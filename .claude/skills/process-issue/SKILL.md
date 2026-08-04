name: process-issue
description: Implements a GitHub issue end-to-end: reads the ticket, creates a branch dedicated to it, implements and tests the change, opens a PR linked to the issue, then hands off to `process-pr` for a self-review pass plus CI/SonarCloud babysitting until everything is green. Takes a GitHub issue link (or `owner/repo#123` / bare number) as its argument. Use when the user wants an issue/ticket implemented and turned into a passing PR, e.g. "work on https://github.com/wrk-tafel/admin/issues/2989" or "implement issue #123".
---

This workflow is fully automated end-to-end (implementation, testing, branch, PR, CI babysitting) —
never ask the user to run a command, restart something, or confirm intermediate state yourself.
**Never merge the resulting PR** — the workflow ends at "PR open, all checks green," same as this
repo's other skills (`process-dependabot`, `cleanup-git`, `process-pr`). Never fix a red check by weakening
it (skipping a test, loosening a lint rule, lowering a Sonar gate, `--no-verify`) — fix the root
cause, same philosophy as `fix-e2e`.

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
infer `<type>` from AGENTS.md's Commit Conventions list (`feat`, `fix`, `docs`, `refactor`, `chore`,
...).

Branch name: `<type>/<short-kebab-slug>-<issue-number>` — the issue number is what makes it
unambiguous, so the slug itself just needs to be recognizable, not exhaustive:

```bash
git checkout -b fix/async-request-not-usable-log-noise-2986
```

## 4. Implement

Follow this repo's conventions from `AGENTS.md` (module boundaries, DTO `Request`/`Response`/`Item`
suffix rules, Angular signal-based patterns, `@if`/`@for` flow-control syntax, etc.) — read the
relevant module's existing code before writing new code, don't guess at patterns.

- Any new/changed **frontend user-facing behavior** needs an added/updated Cypress e2e case under
  `cypress/e2e/`, not just a Vitest unit spec — easy to forget, and explicitly called out in
  AGENTS.md's Testing section.
- Any new/changed **user-facing feature** needs the German user guide (`docs/userguide/`) updated
  in the same task, including screenshots if the UI changed (see AGENTS.md's User Guide section for
  the cursor/anchor/cross-link rules).
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

For larger changes, also run full builds for CI-equivalent confidence: `./gradlew :backend:bootJar`
and `npm run build-prod`. If the change touches any flow covered by Cypress, verify it end-to-end
using the `fix-e2e` skill's workflow (it owns the backend-restart-with-`e2e`-profile ritual) rather
than re-deriving that setup here.

## 6. Commit

Conventional Commits subject, matching AGENTS.md's Commit Conventions exactly (lowercase
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
repo squash-merges with the PR title becoming the final commit — see AGENTS.md). The `Closes
#<issue-number>` line is what auto-closes the issue once the squash commit lands on `main`.

## 8. Hand off to process-pr

Invoke the `process-pr` skill for the PR just opened (Skill tool, skill: `process-pr`, args:
`<owner>/<repo> <pr-number>`) — it re-reads the diff as a self-review pass, fixes anything it finds,
then watches `gh pr checks` and diagnoses/fixes any red job (including querying the SonarCloud API
for quality-gate detail rather than guessing from the dashboard) until everything is green, and
reports the PR URL back. Don't re-derive that logic here — this skill's own workflow ends at the
hand-off.
