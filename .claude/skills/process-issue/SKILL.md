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

## 5. Verify locally — only what this branch changed

**Run only the tests and checks that cover the code this branch touched, and never a full suite —
of any kind.** That applies to every category equally: backend tests, backend integration tests,
frontend unit specs, Cypress e2e, lint, type-check and builds. A full local run costs many minutes
and duplicates exactly what the pipeline does on every push, so it delays the PR without adding
information. Running the whole suite is CI's job, not this workflow's.

Targeted invocations — filter every one of them:

```bash
# Backend: the touched test/IT classes only (wildcards, since method names are backticked)
./gradlew :backend:test --tests "*HouseholdServiceTest" --tests "*AdvisoryLockServiceIT"

# Frontend unit: the touched specs only
cd frontend/src/main/webapp && npm test -- --include="src/app/<path>/<file>.spec.ts"

# Frontend lint: the touched files only
npx eslint src/app/<path>/<file>.ts

# Cypress: the affected spec(s) only, via fix-e2e's backend-restart-with-`e2e`-profile ritual
npx cypress run --spec "cypress/e2e/<file>.cy.ts"
```

What follows from that rule:

- Never run `./gradlew :backend:test`, `npm run test-ci`, `npm run lint`, `npm run typecheck` or
  `npm run cy:run-ci` unfiltered, and never a full `./gradlew :backend:bootJar` / `npm run build-prod`
  "for CI-equivalent confidence". If such a run is already going, stop it.
- A check that has no per-file filter (`ktlintCheck`, `typecheck`) is CI's by default. Run it only
  when the change is specifically about formatting or typing and there is no narrower way to see the
  result — and say so when reporting.
- If a targeted run comes back red, fix the cause and re-run that same targeted set. Don't widen to
  the full suite to check whether anything else broke; that's precisely what the pipeline is for.
- **Skip tests entirely for a pure styling/layout change** — one that only touches CSS classes,
  colours, spacing, ordering or markup structure and changes no behavior. These suites assert
  functional behavior only, so they can neither confirm nor refute a visual change. Verify it by
  looking at it (see `run`/browser automation) and let CI cover the rest. This stops applying the
  moment the diff also touches component logic, bindings, form state or an API — then it's a normal
  change and gets the targeted runs above.
- Report honestly in the PR which targeted checks ran and that the full suites were left to CI —
  never imply a broader run happened than actually did.

## 6. Commit

Conventional Commits subject, matching the format exactly (lowercase
description, no trailing period, ≤100 char header, valid `type`) — this is enforced by a commit-msg
hook, `commitlint`, and `pr-title-lint` in CI, and has been the recurring miss in this repo.

## 7. Make sure the branch still merges into main

main moves while a change is being written, and a branch that conflicts with it gets **no pipeline
at all**: GitHub builds `pull_request` runs against a merge ref it can only create when the merge is
clean, so a conflicting PR sits with zero checks queued rather than with red ones — easy to misread
as "CI is slow". Check before pushing:

```bash
git fetch origin main
git merge origin/main --no-edit
```

If it conflicts, resolve it here rather than handing it back to the user:

- Read both sides in full before picking one. `git log --oneline HEAD..origin/main -- <file>` shows
  what landed on main and why, which is usually what settles it.
- Where main reworked the same code this branch touched, main's version is the base to re-apply this
  branch's intent onto — not something to overwrite with the pre-merge version.
- Check whether main's new code re-introduced whatever this branch set out to remove (an inline
  style, a duplicated helper, a deprecated pattern). The branch's goal has to hold for the merged
  result, not just for its own hunks.

Then re-run the step 5 checks that cover what the merge touched — still only those, not the full
suite: the merged tree is code nobody has built yet, even though both sides were green on their own.

## 8. Push and open the PR

```bash
git push -u origin <branch>
gh pr create --repo <owner>/<repo> --base main --head <branch> \
  --title "<type>(<scope>): <description>" \
  --body "$(cat <<EOF
## Summary
<what changed and why, referencing the issue>

Closes #<issue-number>

## Test plan
- [x] <the targeted runs that were actually executed, e.g. ./gradlew :backend:test --tests "*XyzServiceTest">
- [ ] CI (full backend/frontend suites, lint, build)

🤖 Generated with Claude Code
EOF
)"
```

The PR title itself must pass `pr-title-lint` (same Conventional Commits rule as commits, since this
repo squash-merges with the PR title becoming the final commit). The `Closes
#<issue-number>` line is what auto-closes the issue once the squash commit lands on `main`.

Report the PR URL back to the user. Stop there — this skill's own workflow ends once the PR is
open; it does not review the diff further or babysit CI.
