# ADR-0073: The eager bundle is bounded by its bytes only

**Status:** accepted · **Recorded:** 2026-10-16

Supersedes the file-count ceiling of [ADR-0037](0037-eager-bundle-bounded-by-its-own-build-check.md);
the rest of that record stands.

## Context

[ADR-0037](0037-eager-bundle-bounded-by-its-own-build-check.md) made
`frontend/src/main/webapp/check-eager-bundle.cjs` fail the build on two ceilings for the JavaScript a
first visit loads before rendering: its raw bytes, and the number of files it is split into (8). The
file count was there because production was served over HTTP/1.1, where a browser opens six
connections per origin and the application's live-update streams already held some of them.

Production is served over HTTP/2 now. All requests to the origin share one connection, so a few more
files cost a few more frames on that connection, not a connection each.

The file count also turned out to say little about the code itself. The chunk optimizer (rolldown)
decides how the eager code is split into files from which lazy chunks share which modules, so adding
a lazy route anywhere can change the count without a single byte moving onto the login page. That
happened when the server-side sessions change (#3848) met the password reset (#3850): each built
with 7 eager files on its own, together they built with 10. The eager app modules were the same 37
and the payload grew by 1.4 kB gzip.

## Decision

**The build check bounds the eager scripts' raw bytes only.** `MAX_EAGER_SCRIPT_FILES` and its
failure are removed from `check-eager-bundle.cjs`. The byte ceilings (900 kB warning, 950 kB error)
stay as they are, and the check still prints every eager file with its raw and gzip size, so a split
that grows out of proportion is visible in the build log.

## Consequences

- A change that only reshuffles the optimizer's chunks no longer fails the build, and nobody has to
  restructure imports to steer rolldown back under a number.
- **The number of eager requests is no longer gated anywhere at build time.** Lighthouse still
  measures the real requests and transfer size of the login page (`lighthouserc.cjs`), but it runs
  after the merge (ADR-0055), so a sharp rise in requests would show up there, not on the pull
  request.
- This leans on production staying on HTTP/2. If the application is ever served over HTTP/1.1 again,
  the file count matters again, and this record is the one to revisit.

## Alternatives considered

**Raise the ceiling (e.g. to 10).** It would have made #3848 green, but it keeps a limit whose
reason no longer holds and that the optimizer can cross again with the next lazy route, for no
change in what the user downloads.

**Restructure imports until the optimizer splits into 8 files again.** Trial and error against a
bundler heuristic, with no guarantee it holds after the next feature, to satisfy a number that no
longer reflects a cost.

## References

- [ADR-0037](0037-eager-bundle-bounded-by-its-own-build-check.md), [ADR-0055](0055-lighthouse-runs-after-the-merge-not-on-every-pull-request.md)
- `frontend/src/main/webapp/check-eager-bundle.cjs`, `frontend/src/main/webapp/lighthouserc.cjs`
- #3848 (server-side sessions), #3850 (password reset)
