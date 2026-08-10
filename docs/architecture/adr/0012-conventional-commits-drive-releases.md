# ADR-0012: Conventional Commits drive the release version

**Status:** accepted · **Recorded:** 2026-08-09

## Context

Releases are cut from the `release` branch by a GitHub Actions workflow that builds the image, tags
it, publishes a GitHub release and deploys. Somebody has to decide what the next version number is.
Doing that by hand means remembering to bump a file, agreeing on whether a change was a feature or a
fix, and getting it wrong occasionally — quietly, since nothing checks it.

The repository squash-merges pull requests, and the repo setting `squash_merge_commit_title:
PR_TITLE` means **the PR title becomes the commit message on `main`**. Whatever discipline applies to
commits therefore has to apply to PR titles, or it applies to nothing.

## Decision

**Commit subjects and PR titles must follow [Conventional Commits](https://www.conventionalcommits.org),
and the release version is derived from them.**

Format: `<type>[optional scope][!]: <description>`, with

- `type` one of `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`,
  `revert`,
- a description that does not start with an uppercase letter and does not end with a period,
- a header of at most 100 characters,
- `!` after the type/scope for a breaking change, not a `BREAKING CHANGE:` footer.

`release.yml`'s `version` job runs `paulhatch/semantic-version`, which derives the next version from
the commit types since the last tag: `feat` → minor, `!` → major, anything else (including `fix` and
`perf`) → patch, that action's implicit default.

Three enforcement points, with identical rules so nothing that passes one fails another:

1. `.githooks/commit-msg` — locally, once `git config core.hooksPath .githooks` has been run,
2. the `commitlint` CI job — the individual commits of a PR,
3. the `pr-title-lint` CI job — the PR title itself, which is what actually lands on `main`.

## Consequences

- The version number is a function of the history. Nobody bumps a file, and the release notes
  correspond to what was merged.
- **A malformed subject mis-bumps a release or silently falls back to a patch bump.** That is why
  this is enforced rather than recommended, and why the enforcement includes the PR title —
  linting only the commits of a squash-merged PR would check text that never reaches `main`.
- Contributors must classify each change. The `fix` vs. `feat` distinction is occasionally arguable;
  the tie-breaker is what a user would notice.
- Three enforcement points must be kept in sync. They exist because each covers a gap the others
  do not: the hook gives instant local feedback but is opt-in per clone, `commitlint` covers
  contributors without the hook, and `pr-title-lint` covers the one string that becomes history.
- The `docs`, `chore`, `ci`, `test`, `build` types all produce a patch bump rather than no release.
  Accepted: a version number that moves for a docs-only change is cheaper than a special case.

## Alternatives considered

**Manual version numbers in a file.** Rejected: it is one more thing to forget, it conflicts on
every parallel branch, and it decouples the number from what actually changed.

**`semantic-release` with full changelog generation.** Rejected as more machinery than needed; the
version derivation is the part that was actually wanted, and GitHub's own release notes cover the
rest.

**Convention without enforcement.** Rejected: an unenforced commit convention degrades to noise, and
here the degradation is not cosmetic — it changes the released version number.

**Linting commits only, not the PR title.** Rejected: with squash merges the PR title *is* the
commit, so this would enforce the rule on exactly the text that gets thrown away.

## References

- `.github/workflows/release.yml` — the `version` job
- `commitlint.config.cjs`, `.githooks/commit-msg`
- `.github/workflows/pull_request.yml` — `commitlint` and `pr-title-lint` jobs
- `CLAUDE.md` — "Commit Conventions"
</content>
