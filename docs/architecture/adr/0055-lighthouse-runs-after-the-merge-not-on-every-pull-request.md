# ADR-0055: Lighthouse rates the frontend after the merge, not on every pull request

**Status:** accepted · **Recorded:** 2026-09-03

Narrows [ADR-0036](0036-page-performance-index-in-the-pipeline.md), which is otherwise unchanged.

## Context

[ADR-0036](0036-page-performance-index-in-the-pipeline.md) put two Lighthouse jobs on every pull
request that touches the frontend: `shell`, which gates the login page's load cost, and `pages`,
which sweeps every route in both form factors and enforces accessibility at 1.0. It named the cost
in its own consequences — "the pipeline's widest job by runner count" — and accepted it for the
sake of catching a regression in the pull request that caused it.

Measured on a representative pull-request run
([33751703910](https://github.com/wrk-tafel/admin/actions/runs/33751703910)), that cost is **2774
seconds of runner time across 9 jobs**, second only to the e2e suite's 6297s and roughly six times
the whole rest of the pipeline outside those two. Each `pages` shard boots a Postgres service and a
backend jar to audit a handful of routes, and the sweep is repeated on every push to every frontend
branch.

What that buys is narrower than it looks, because accessibility is checked three times over and only
one of those three is this sweep ([ADR-0038](0038-axe-assertions-in-the-e2e-suite.md) records the
post-interaction layer):

- `eslint.config.js` extends `angular.configs.templateAccessibility`, so `lint-frontend` fails a pull
  request on an unfocusable click handler, an unassociated label, a missing `alt` or a bad `aria-*`
  — over *every* template, not just the routes in a matrix.
- `cypress/support/accessibility.ts` runs axe inside the e2e suite, at the states the specs navigate
  to — dialogs, expanded panels, non-default tabs — which the route sweep never reaches at all.
- The `pages` sweep audits what a route renders on load, for the routes someone remembered to add to
  the matrix.

The first two still run on every pull request and are unaffected by this record. The third is the
expensive one, and it is also the one whose findings are least likely to be novel: a control it flags
on load is usually one the template lint or an e2e axe assertion would have flagged too.

## Decision

**The `lighthouse` workflow is called from `main_push.yml` and `release.yml` only. A pull request no
longer runs it.**

- On `main` it keeps its existing gate — `needs.changes.outputs.frontend == 'true'`, since a
  backend-only merge ships a byte-identical bundle.
- On a release it is ungated, like every other job in `release.yml`: a release rates the frontend it
  is about to ship, whatever changed since the last one.
- In neither pipeline is it a dependency of the deploy jobs, which is unchanged from ADR-0036 and for
  the same reason: a threshold that trips is a signal to act on, not a reason to withhold a merged
  change from an environment.
- The thresholds themselves, the two `lighthouserc*.cjs` files, the session handling, the route
  matrix and the "was the sweep authenticated" check are untouched. This record changes *when* the
  jobs run and nothing else.

## Consequences

- **A frontend pull request is ~2774 seconds of runner time cheaper**, and its wall clock loses a
  ~350-second job that ran alongside the e2e suite.
- **A performance or accessibility regression is now caught on `main`, after the merge, not on the
  pull request that introduced it.** This is the real cost and it is not small: the person who has
  to act on a red `lighthouse` run on `main` is whoever notices, and the change is already in `dev`
  and `test` by then. The mitigation is that this is exactly how the Trivy image scan and the
  `pages` sweep's own deploy-independence already work here — a post-merge signal that blocks
  nothing but has to be read.
- **The two accessibility layers that do run on a pull request carry more weight than before.** A new
  dialog, tab or expanded panel needs its `cy.checkAccessibility()` assertion, because the sweep that
  might otherwise have caught the route's initial render is a merge away. That expectation was
  already written down; it is now load-bearing.
- **A release can fail on a threshold that `main` already reported.** The release pipeline re-rates
  an unchanged frontend, so the same finding surfaces twice. That is deliberate — a release should
  not be the first run that skips the check — but it means the release-time failure is usually a
  reminder rather than news.
- **Nothing changes for a backend-only pull request**, which never ran these jobs anyway.
- Reverting is a two-line change: the job block moves back into `pull_request.yml`. Nothing in the
  Lighthouse configuration encodes which pipeline calls it.

## Alternatives considered

**Keep `shell` on pull requests, move only `pages`.** The tempting middle: `shell` is the cheap half
(~1 minute, no backend, no database) and the one that actually gates load cost, which is the
regression ADR-0036 was written for and the one code review genuinely cannot see. Rejected only
narrowly, and this is the first thing to reconsider if a bundle regression reaches `main`: the
`pages` sweep is 8 of the 9 jobs and essentially all of the 2774 seconds, so keeping `shell` would
have retained most of the value. It was dropped for consistency — one rule for when the frontend gets
rated, rather than two halves of one workflow running in different pipelines — which is a weaker
reason than the measurement behind the rest of this record.

**Run the sweep on a schedule** (nightly against `main`). Cheaper still, and it decouples the sweep
from any one change. Rejected: a nightly failure has to be bisected back to one of a day's merges,
where a `main` run names the merge outright.

**Shrink the matrix instead** (fewer routes, one form factor). Keeps a pull-request signal at a
fraction of the cost. Rejected: the sweep's value is that it covers every route, and mobile is where
the responsive card layouts and tap-target audits mean anything. A sweep of a sample would cost real
runner time to answer a question about the routes nobody picked.

**Trigger it with a label** (`run-lighthouse` on the pull request). Rejected: an opt-in check is only
ever remembered by the person who already suspects a problem, which is not the case this exists for.

## References

- `.github/workflows/main_push.yml`, `.github/workflows/release.yml` — the two callers
- `.github/workflows/pull_request.yml` — no longer one
- `.github/workflows/subflow_lighthouse.yml` — unchanged by this record
- [ADR-0036](0036-page-performance-index-in-the-pipeline.md) — what the jobs measure and why
- `frontend/src/main/webapp/cypress/support/accessibility.ts`, `eslint.config.js` — the two
  accessibility layers that still run on every pull request
