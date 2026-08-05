name: cleanup-git
description: Removes stale git worktrees and deletes every local git branch except `main`, `release` (safely handling both the currently checked-out branch and any branch still checked out in a linked worktree). Use when the user wants to clean up, prune, or remove old/stale local branches and/or worktrees in this repo.
---

Goal: end up with only `main` and `release` as local branches, and only worktrees that are still
in active use — without ever losing work that isn't safely recoverable (either from `origin` or
from a merged/squash-merged PR record).

Worktrees are cleaned up first, since a branch checked out in a linked worktree can't be deleted
until that worktree is gone (`git branch -d`/`-D` refuses with "branch is checked out at
<path>").

## 1. See what's there

```bash
git fetch origin --prune
git worktree prune -v      # safe no-op unless a worktree dir was deleted by hand outside git
git worktree list --porcelain
git branch -vv
```

The first entry in `git worktree list` is always the **main worktree** (this repo checkout itself,
where `.git` lives) — never remove it. Every other entry is a **linked worktree** and a candidate
for removal, including:
- ones under `.claude/worktrees/` (created by the `EnterWorktree` tool for a session, normally
  cleaned up at session end but sometimes left behind if a session ended abruptly)
- sibling directories like `../admin-pr<N>` (created by an `Agent` call with
  `isolation: "worktree"`, or manually via `git worktree add`)

If the session running this skill is itself currently inside a linked worktree (check whether
`git rev-parse --show-toplevel` is the main worktree path or a linked one), leave that worktree
alone regardless of its classification below — don't remove the ground you're standing on. Note it
in the report instead.

## 2. Classify each worktree

For every linked worktree (from the porcelain output, `path` field):

- **Locked** (a `locked` line present, with or without a reason): leave it alone — a lock is an
  explicit "don't touch this" signal. Report it with its reason.
- **Dirty** (uncommitted changes or untracked files): check with
  `git -C <path> status --porcelain`. If non-empty, leave it alone — don't discard work, and don't
  auto-commit or stash on the user's behalf. Report it.
- **Clean**: safe to remove *if* its branch turns out to be safe to delete per the branch
  classification in step 3 below. Hold it until then — a clean worktree on a branch with an open
  PR or no PR record should still be kept (see step 3), since the worktree is how the user gets
  back to that in-progress work.

## 3. Classify each branch — don't force-delete blind

Every local branch except `main` and `release` is a deletion candidate, including the branch
currently checked out (in the main worktree or any linked one) — this repo squash-merges PRs (see
CONTRIBUTING.md), so a finished feature branch is expected to still exist locally even after its
PR is merged.

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

## 4. Handle the currently-checked-out branch (main worktree)

If the branch checked out in the *main* worktree is a deletion candidate, switch away first — but
check `git status` before doing so, and stash (`git stash -u`) any uncommitted work rather than
discarding it:

```bash
git status
git checkout main
```

Then classify it like any other candidate from step 3 before deleting it. (A branch checked out in
a *linked* worktree is instead freed up by removing that worktree in step 5 — no need to switch
anything for those.)

## 5. Remove worktrees, then delete branches

Order matters: remove a linked worktree before deleting the branch it held, otherwise the branch
delete fails.

- **Worktree confirmed clean (step 2) whose branch is confirmed safe to delete (step 3)**: remove
  the worktree, then delete the branch:
  ```bash
  git worktree remove <path>
  git branch -D <branch>   # or -d if it was a normal merge
  ```
- **Worktree confirmed clean but its branch has an open PR or no PR record**: keep both — the
  worktree is legitimate in-progress workspace. Report it as kept.
- **Worktree locked or dirty**: keep it regardless of what its branch classification would
  otherwise allow — don't remove a worktree out from under uncommitted work. Report it as kept.
- **Branches with no linked worktree**: delete directly per step 3's classification, no per-branch
  prompt needed — but keep a running list of what you delete.
- **Anything else** (open PR, no PR record, locked/dirty worktree, ambiguous): do not delete —
  hold it for the report.

## 6. Report

One summary, split by kind:

**Worktrees:**
- Removed: `<path>` (branch `<branch>`) — merged / squash-merged via PR #N
- Kept: `<path>` — locked (`<reason>`) / has uncommitted changes / open PR #N / no PR record, needs
  your call / is the worktree this session is running in

**Branches:**
- Deleted: `<branch>` — merged / squash-merged via PR #N
- Kept: `<branch>` — open PR #N / no PR record, needs your call / still held by a kept worktree /
  was the current branch and had unstashed changes

**Never:**
- delete `main` or `release`, or remove the main worktree
- remove a locked or dirty worktree
- force-delete (`-D`) a branch without either a `MERGED` PR record from `gh` or explicit user
  confirmation for that specific branch
- discard uncommitted work (in the main checkout or any worktree) to reclaim it — stash or leave it,
  never `git worktree remove -f` / `git clean` / `git checkout .` your way past real changes
