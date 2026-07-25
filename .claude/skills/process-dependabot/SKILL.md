name: process-dependabot
description: Consolidates all open Dependabot pull requests into a single branch, builds and tests the result, fixes any breakage caused by the bumps, then pushes the branch and opens one combined PR for manual review. Use when the user wants to process, consolidate, merge, or clean up open Dependabot PRs in this repo (wrk-tafel/admin).
---

Goal: turn N open Dependabot PRs into one buildable, tested branch + one PR, then hand it to the user for manual review. **Never merge the resulting PR yourself** — the workflow ends at "PR opened, link reported back."

## 1. Discover open Dependabot PRs

```bash
gh pr list --author "app/dependabot" --state open --json number,title,headRefName,baseRefName,url
```

Filter to `baseRefName == "main"`. If the list is empty, tell the user there's nothing to do and stop here — do not create a branch or PR.

## 2. Sync main and create the consolidation branch

```bash
git status                     # must be clean before switching branches; stash/ask if not
git fetch origin main
git checkout main
git pull --ff-only origin main
git checkout -b dependabot/consolidated-updates-YYYY-MM-DD   # use today's date
```

If a branch/PR with that name already exists from an earlier run today, check with `gh pr list --head <branch>` and reuse or suffix (`-2`, `-3`, …) rather than force-overwriting it.

## 3. Merge each Dependabot branch in

Merge smallest/lowest-risk bumps first (single-package patch bumps, `github_actions` group) and save large grouped bumps (e.g. an `angular` group with a dozen packages) for last — conflicts are easier to reason about that way.

For each PR, in that order:

```bash
git fetch origin <headRefName>
git merge origin/<headRefName> --no-edit -m "Merge dependabot PR #<number>: <title>"
```

**Conflict resolution:**
- `package-lock.json`: don't hand-resolve the JSON. Take either side, then regenerate: `cd frontend/src/main/webapp && npm install && cd -`, then `git add package-lock.json`.
- `package.json` / gradle version catalog (`gradle/libs.versions.toml`) conflicts between two independent dependency bumps: keep both bumps (i.e. the higher version each dependabot branch introduced for its own package), don't silently drop one.
- After resolving, `git add -A && git commit --no-edit` to finish the merge.
- If a merge is truly unresolvable cleanly, skip that one PR, note it, and continue with the rest rather than blocking the whole batch — report the skipped PR to the user at the end.

## 4. Build and test the merged result

```bash
./gradlew build
```

This alone covers backend compile+test and frontend `npm install` + `test-ci` + `build-prod` (wired via `frontend/build.gradle.kts`). Also run:

```bash
cd frontend/src/main/webapp && npm run lint && cd -
```

since eslint/typescript-eslint bumps commonly surface new lint violations.

## 5. Fix breakage caused by the bumps

If `./gradlew build` or lint fails because of a version bump (deprecated API removed, type signature changed, new lint rule, etc.), fix the **source code**, not the dependency version and not the test assertions — the fix-e2e philosophy applies here too: fix the root cause, don't weaken checks to make failures disappear. Re-run the specific failing module (`./gradlew :backend:test --tests "..."` or `npm test -- --include=...`) to confirm, then re-run the full `./gradlew build` before moving on. Commit fixes as separate, clearly-scoped commits (e.g. `fix: adjust CustomerService for Spring Data JPA 4.x API change`).

If a bump is too disruptive to fix quickly (major version with a large breaking-change surface), drop that one PR from the batch: `git revert` its merge commit (or reset back before it if it was the last one merged), note it as skipped, and leave it for the user to handle separately.

## 6. Push and open the PR

```bash
git push -u origin <branch>
gh pr create --base main --head <branch> \
  --title "Consolidate dependabot updates (YYYY-MM-DD)" \
  --body "$(cat <<'EOF'
## Summary
Consolidates the following open Dependabot PRs into one branch, built and tested together:

- #<number> <title>
- #<number> <title>
...

Any fixes required by breaking changes are included as separate commits on this branch.

Skipped (left open, needs manual handling): #<number> <title>   <!-- omit this line if none were skipped -->

## Test plan
- [x] `./gradlew build`
- [x] `npm run lint`
- [ ] manual review

🤖 Generated with Claude Code
EOF
)"
```

Do not close the original Dependabot PRs yourself — mention in the PR body which ones are superseded and let the user close them (or let Dependabot auto-close them once `main` is up to date).

## 7. Report back

Reply with only the PR URL (from the `gh pr create` output) plus a one-line note of anything skipped or fixed. The user reviews and merges manually — do not merge, and do not push further commits to the branch without being asked.
