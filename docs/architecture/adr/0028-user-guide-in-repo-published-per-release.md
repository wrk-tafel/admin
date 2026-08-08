# ADR-0028: The user guide lives in the repository and ships as a PDF with every release

**Status:** accepted · **Recorded:** 2026-08-09

## Context

The people using this system are volunteers at a food bank, not software users in the professional
sense. Turnover is high and training is informal, so a written guide in German is part of the product
rather than a nicety.

Documentation kept anywhere other than next to the code has one predictable failure mode: it
describes a version of the application that no longer exists. Screenshots go stale silently — nothing
fails, nobody is notified, and the guide quietly becomes misleading.

## Decision

**The guide is Markdown in the repository, updated in the same task as the change it documents, and
built into a PDF by the release pipeline.**

- `docs/userguide/` holds `README.md` plus one file per module, with screenshots under
  `docs/userguide/images/`. It is written in German, for end users.
- **Any user-facing feature or change updates the guide as part of the same task**, including new or
  replaced screenshots — not as a follow-up.
- Screenshots follow explicit rules so that a UI change invalidates as little as possible: cropped to
  the relevant panel/dialog/table with sidebar and header removed (a small set of deliberate
  exceptions keep the header because their subject is anchored to it), no mouse cursor visible, and
  error/edge states covered, not just the happy path.
- Cross-chapter links stay plain file links so they work on GitHub and in an IDE. Each chapter file
  carries an explicit `<a id="kapitel-<name>"></a>` anchor — named `kapitel-*` because a bare id can
  collide with an unrelated heading's generated slug once the chapters are merged into one PDF and
  silently jump to the wrong place.
- The `userguide-pdf` job in `release.yml` concatenates the chapters in a fixed order, rewrites the
  cross-file links for the merged document, renders the PDF, and attaches it to the GitHub release.
  Its own toolchain is installed from a committed lockfile with `--ignore-scripts`
  ([ADR-0019](0019-supply-chain-and-container-runtime-hardening.md)).
- `README.md` links to the latest release's PDF via a stable URL.

## Consequences

- The guide is reviewed in the same pull request as the change it describes, so a reviewer sees the
  feature and its documentation together — the only reliable moment to notice they disagree.
- Every release produces a versioned PDF that can be printed or handed out, matching exactly that
  version of the application.
- **Screenshot upkeep is the real cost**, and it is ongoing. A theme or layout change can invalidate
  many images at once, which is precisely why the cropping rule exists — a sidebar change should not
  cost the whole set.
- The rules are easy to violate accidentally: a stray mouse cursor persists across navigations within
  a browser session, and two near-identical screens can be different flows (the in-app password
  change and the forced post-login one are separate routes). Both are documented as traps because
  both have been fallen into.
- Adding a chapter or a new cross-file link is not just a Markdown edit: the anchor has to match and
  the filename list in the PDF job's link-rewriting rules has to be extended, or links break in the
  PDF only — where nobody looks until after the release.
- Because it lives outside the code being edited, updating it is the step most often forgotten. It is
  called out in `CLAUDE.md` for that reason.

## Alternatives considered

**A wiki or an external documentation site.** Rejected: it decouples the guide from the change, and
nothing in the review process would ever notice it going stale.

**Generated documentation from the code.** Rejected: this guide explains a workflow to a volunteer at
a desk — which button to press during check-in — and none of that is derivable from source.

**Documentation as a follow-up ticket.** Rejected: the follow-up is written after the context is gone,
by someone who has to rediscover it, and in practice it is the ticket that never gets picked up.

**Ship the PDF from a separate manual build.** Rejected: a manual step means the released PDF and the
released application drift apart at exactly the moments that matter.

## References

- `docs/userguide/`
- `.github/workflows/release.yml` — the `userguide-pdf` job
- `CLAUDE.md` — "User Guide"
</content>
