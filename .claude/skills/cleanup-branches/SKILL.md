name: cleanup-branches
description: Deletes every local git branch except `main`, `release` (and safely handles the currently checked-out branch if it's one of them). Use when the user wants to clean up, prune, or remove old/stale local branches in this repo.
---

Goal: end up with only `main` and `release` as local branches — delete everything else — without
ever losing work that isn't safely recoverable (either from `origin` or from a merged/squash-merged
PR record).

## 1. See what's there

```bash
git fetch origin --prune
git branch -vv
```

Every local branch except `main` and `release` is a deletion candidate, including the branch
currently checked out — this repo squash-merges PRs (see CONTRIBUTING.md), so a finished feature
branch is expected to still exist locally even after its PR is merged.

## 2. Classify each candidate — don't force-delete blind

For every candidate branch:

- **Merged into `main` via a normal (non-squash) merge**: shows up in `git branch --merged main` →
  safe, plain `git branch -d <branch>` works and is proof enough on its own.
- **Squash-merged (the common case here)**: `git branch --merged` won't show these — the squash
  commit isn't an ancestor of the original branch tip. Check GitHub instead:
  ```bash
  gh pr list --head <branch> --state all --json number,state,title
  ```
  A `MERGED` PR means it's safe to delete even though `git branch -d` will refuse (it can't see
  the squash relationship) — use `git branch -D <branch>` for these specifically, since the PR
  record is what makes the force safe, not the other way around.
- **Open PR**: leave it alone and report it — the user may still be working on it.
- **No PR record at all** (never pushed, or pushed then closed unmerged): don't guess. List it
  separately and ask the user whether to keep or force-delete it — never silently force-delete a
  branch with no merged-PR backing it.

## 3. Handle the currently checked-out branch

If it's a deletion candidate, switch away first — but check `git status` before doing so, and
stash (`git stash -u`) any uncommitted work rather than discarding it:

```bash
git status
git checkout main
```

Then classify it like any other candidate from step 2 before deleting it.

## 4. Delete

- Confirmed safe (merged, or squash-merged with a `MERGED` PR record): delete directly, no
  per-branch prompt needed — but keep a running list of what you delete.
- Anything else (open PR, no PR record, ambiguous): do not delete — hold it for the report.

## 5. Report

One summary:
- Deleted: `<branch>` — merged / squash-merged via PR #N
- Kept: `<branch>` — open PR #N / no PR record, needs your call / was the current branch and had
  unstashed changes

**Never:**
- delete `main` or `release`
- force-delete (`-D`) a branch without either a `MERGED` PR record from `gh` or explicit user
  confirmation for that specific branch
- discard uncommitted work to switch off the current branch — stash it first
