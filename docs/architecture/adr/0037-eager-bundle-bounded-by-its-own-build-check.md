# ADR-0037: The eager bundle is bounded by a build check of its own, not by Angular's `initial` budget

**Status:** accepted · **Recorded:** 2026-08-09

## Context

[ADR-0036](0036-page-performance-index-in-the-pipeline.md) tightened Angular's build budgets and then
recorded the hole it could not close: the `initial` budget bounded 424 kB of a first load that was
really 1.08 MB of raw JavaScript ([#3121](https://github.com/wrk-tafel/admin/issues/3121)).

The cause is in the builder, not in the configuration. `@angular/build` runs a chunk optimizer
(rolldown, enabled from three lazy chunks up) that re-bundles esbuild's output and then re-derives
which chunks the entry point pulls in. That re-derivation walks the entry's static imports and builds
a record for each one — and never stores it. Every chunk `main.js` statically imports is therefore
dropped from the set of initial files, which decides three things at once: what the `initial` budget
counts, what the build report calls an "Initial chunk file", and which files `index.html` gets a
`modulepreload` hint for. All three end up covering `main.js` and the stylesheet alone.

The consequence is not academic. A dependency that lands in one of those shared chunks grows what the
login page downloads without any check turning red, and the chunks are discovered a round trip late
because nothing preloads them.

Setting `NG_BUILD_OPTIMIZE_CHUNKS=false` restores all three behaviours. It also stops the chunk
merging the optimizer exists for: the same application then ships 17 eager script files instead of 6.
Production is served over HTTP/1.1, where a browser opens six connections per origin and three of
them are already held open by this application's SSE streams
([ADR-0005](0005-server-sent-events-with-a-transactional-outbox.md)), so trading a correct label for
seventeen requests is the worse deal.

## Decision

**The chunk optimizer stays on, and the eager payload is bounded by
`frontend/src/main/webapp/check-eager-bundle.cjs`, which `npm run build-prod` runs after the build.**
It reads the `dist/stats.json` the build now writes, walks `import-statement` edges from the entry
point — the same walk the builder gets wrong — and fails the build when the raw bytes or the file
count of what it finds exceeds the ceilings recorded in it. Raw bytes, because that is the measure
`angular.json`'s budgets use and the one this replaces; the file count, because of the connection
budget above.

**The eager payload is also cut down to what the login page actually needs.** Everything behind the
login moved into `src/app/shell.routes.ts`, loaded lazily from `app.routes.ts`, which now keeps only
the login page and the two error screens eager. The Material defaults that can be provided per route
— `MatPaginatorIntl` and `MAT_TOOLTIP_DEFAULT_OPTIONS` — moved
into that route's `providers` with the shell they configure. `MAT_DIALOG_DEFAULT_OPTIONS` could not
follow: `MatDialog` is `providedIn: 'root'` and reads its defaults from the root injector.

Together that takes the first load from 1053 kB raw over 3 files to 860 kB over 6.

Lighthouse keeps its transfer-size assertions (`lighthouserc.cjs`). The two layers answer different
questions and neither replaces the other: the build check is deterministic, runs on every build
including the image build, and bounds bytes shipped; Lighthouse measures what a browser really
downloaded, compressed, in request count, on a page it also times.

## Consequences

- The number that decides how fast the login page loads finally has a check attached to it, in the
  place the rest of the budgets live — the build.
- **The check is a hand-written stand-in for a builder feature, and it will need revisiting.** If a
  future `@angular/build` stores those records, `initial` starts covering the eager chunks, the
  budgets in `angular.json` suddenly count roughly four times what they do today, and the build fails
  until they are moved. That failure is the signal to delete this check, not to raise the budgets.
- **The `initial` budget now bounds `main.js` plus the stylesheet and nothing else.** It is kept and
  tightened to 260 kB / 320 kB against an actual 227 kB, but reading it as "what the first load
  costs" is exactly the mistake this record exists to prevent.
- **Nothing preloads the eager chunks.** They are still discovered only once `main.js` has been parsed,
  because the `modulepreload` hints come from the same broken set. The check cannot fix that; it can
  only keep the payload behind that extra round trip small.
- The shell is now a lazy chunk, so the first navigation after login fetches 60 kB that used to be
  part of `main.js`. That is a byte moved off the login page's critical path onto a navigation that
  already loads a route chunk, not a byte saved.
- **Two Material defaults are now route-scoped, and a screen outside the shell silently gets the
  library defaults instead.** No such screen exists today — the login page and the error screens use
  neither a paginator nor a tooltip. The mechanism is covered end to end by the paginator-label case
  in `cypress/e2e/user-search.cy.ts`, which fails if a route-level provider stops reaching the
  components under it.
- The check has to be kept in step with the entry point's name (`main-*.js`) and with the build
  writing `dist/stats.json`; both are asserted with a clear error rather than silently passing.

## Alternatives considered

**Disable the chunk optimizer and let the `initial` budget work again.** The obvious fix, and it does
restore correct labelling, budget coverage and preload hints in one setting. Rejected on what it costs
to get them: 17 eager script files instead of 6, on an HTTP/1.1 origin whose connection budget is
already half spent on SSE streams, plus a slightly larger payload overall (946 kB against 860 kB).

**Rely on the Lighthouse transfer-size assertions alone.** They already bound the real payload and
already run on every frontend change. Rejected as the whole answer: the `lighthouse` job is gated on
the frontend having changed and needs a browser, so the image build and every local `build-prod` would
stay blind; and a transfer-size ceiling on a compressed payload is a coarser signal than raw bytes for
"which import did this".

**Patch the builder** (a `postinstall` patch on `@angular/build`, or a custom builder wrapping it).
Rejected: it would fix the label at its source, but it puts a patched build tool in the supply chain
([ADR-0019](0019-supply-chain-and-container-runtime-hardening.md)) and has to be re-validated on every
Angular upgrade, in exchange for a number this repository can compute itself in 100 lines.

**Assert the eager payload in a Vitest spec against the built `dist`.** Would put the check in a suite
that already runs. Rejected: the unit test job does not build the production bundle, so the check would
either build one itself or silently grade a stale `dist`.

## References

- `frontend/src/main/webapp/check-eager-bundle.cjs` — the check, its ceilings, and the upstream bug
  written out in full
- `frontend/src/main/webapp/package.json` — `build-prod`, which runs the build and then the check
- `frontend/src/main/webapp/src/app/app.routes.ts` — what stays eager
- `frontend/src/main/webapp/src/app/shell.routes.ts` — the lazy shell and its route-scoped Material
  defaults
- `frontend/src/main/webapp/src/app/app.config.ts` — why `MAT_DIALOG_DEFAULT_OPTIONS` stayed app-wide
- `frontend/src/main/webapp/angular.json` — the `budgets` block and what it still covers
- `frontend/src/main/webapp/lighthouserc.cjs` — the transfer-size half of the guard
- [ADR-0036](0036-page-performance-index-in-the-pipeline.md), [ADR-0005](0005-server-sent-events-with-a-transactional-outbox.md),
  [#3121](https://github.com/wrk-tafel/admin/issues/3121)
