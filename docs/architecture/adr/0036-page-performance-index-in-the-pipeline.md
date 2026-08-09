# ADR-0036: Page performance rated in the pipeline by Lighthouse, with thresholds that fail the build

**Status:** accepted · **Recorded:** 2026-08-09

## Context

Nothing measured how fast the application loads ([#3104](https://github.com/wrk-tafel/admin/issues/3104)).
The only guard was a pair of Angular build budgets — `initial` at 1.3 MB warning / 2 MB error against
an actual initial bundle of 424 kB, so between three and five times looser than the thing they were
guarding. A change could double the first-load cost without a single check turning red.

Frontend performance also degrades in a way review does not catch: nobody adds a slow page, someone
adds an import, and the import pulls a library into a chunk the shell already loads. On developer
hardware over localhost that is invisible.

Two properties of this application decide what a useful measurement can look like:

- **It is entirely behind a login, and every screen inside shares one shell.** `main.js` plus the
  chunks it statically imports are paid on the first visit to *any* route, so the load cost of the
  shell is the dominant term for all of them.
- **Every authenticated screen holds Server-Sent Events streams open** — `/sse/config` and
  `/sse/distributions` from the layout, plus `/sse/dashboard` on the dashboard
  ([ADR-0005](0005-server-sent-events-with-a-transactional-outbox.md)). Lighthouse ends a page load
  when the network goes quiet, and a stream that never closes means it never does; the run then runs
  to its `maxWaitForLoad` cap instead. Blocking the SSE URLs does not fix it either, because
  `SseService` reconnects with a 1s-doubling backoff, turning one idle connection into a drip of
  retries.

## Decision

**A `lighthouse` pipeline job audits the login page of the built production bundle with Lighthouse
CI, and fails when a category score or a transfer size crosses a threshold. Angular's build budgets
are tightened to bound the build output as a second, deterministic layer.**

- `.github/workflows/subflow_lighthouse.yml` downloads the same `frontend-dist` artifact the image is
  built from, and `lhci autorun` serves it from its own static server (gzip, SPA fallback). The job
  needs no backend jar, no database and no `npm ci` — only Node and the runner's Chrome.
- Three runs per audit; the median run is what assertions and the report are taken from, so a busy
  runner does not decide the outcome and every number in a failure comes from one page load.
- The **desktop** preset, because this is a desktop administration application; Lighthouse's default
  mobile emulation (4× CPU throttling, slow 4G) would grade a device nobody uses it on.
- Thresholds in `frontend/src/main/webapp/lighthouserc.cjs`, each recorded next to the baseline it was
  derived from: performance ≥ 0.9 and accessibility = 1.0 as errors, best practices ≥ 0.9 as a
  warning, FCP ≤ 1.5s, LCP ≤ 2s, CLS ≤ 0.1, and transfer-size ceilings for script, font and total
  bytes.
- Accessibility is held at the full score rather than given noise headroom: those audits grade the
  markup, not the machine, so a drop is a real regression. Best practices is only a warning because
  part of that category grades the *server* (cache headers, CSP, HTTPS) and the server in this job is
  lhci's static one, not the container that serves the files in production.
- The tool version is pinned in the workflow (`LHCI_VERSION`), which fixes the Lighthouse version with
  it (`@lhci/cli` 0.15.1 depends on exactly `lighthouse` 12.6.1), because a Lighthouse upgrade moves
  scores on unchanged code. The job installs that pinned version into a directory of its own with
  `--ignore-scripts` rather than letting `npx` resolve and execute a package on demand
  ([ADR-0019](0019-supply-chain-and-container-runtime-hardening.md)), so neither the application's
  `package.json` nor its `node_modules` are involved.
- Both the HTML and the JSON report are uploaded as a `lighthouse-reports` artifact, and the median
  run's scores, metrics and transfer sizes are written to the job summary — on failure too, which is
  when they are wanted.
- Build budgets in `angular.json` are tightened to sit just above what the build actually produces:
  `initial` 480 kB / 600 kB (actual 424 kB), `anyScript` 600 kB / 800 kB (largest chunk 533 kB),
  `allScript` 3.2 MB / 4 MB (actual 2.7 MB).
- The job is gated on the frontend having changed, not on the application as a whole: a backend-only
  change ships a byte-identical bundle. It is not a dependency of the deployment jobs — a performance
  threshold is a signal to act on, not a reason to withhold a merged change from the test environment.

Measuring the login page is a deliberate choice, not a limitation worked around. It is the one screen
that is anonymous and SSE-free, so it can be measured cold, repeatably, without a database; and what
it measures — the shell every other route also pays for — is the number that actually moves when
someone adds a dependency.

## Consequences

- First-load cost has a number attached, a report to open, and a threshold that blocks. A regression
  shows up in the pull request that caused it.
- Accessibility and best-practices scores come along for free, on the one page every user sees.
- **The measurement covers the shell, not each screen.** A lazily-loaded route chunk that doubles in
  size is caught by the `anyScript` build budget, but its rendering cost is not measured. Auditing a
  logged-in screen needs the backend jar, a database, a login cookie fed in through Lighthouse's
  `extraHeaders`, and a `maxWaitForLoad` cap to deal with the never-idle SSE streams above — a
  worthwhile follow-up, and roughly the same amount of machinery as the e2e job.
- **Absolute numbers from this job are not production numbers.** lhci's static server is not the
  Spring Boot container behind its reverse proxy, and localhost is not the network. What the job can
  compare honestly is one commit against the next, on the same setup.
- The Lighthouse version pin is maintained by hand. Dependabot does not see it, deliberately: as a
  frontend `devDependency`, `@lhci/cli` would drag its transitive tree (Express 4, yargs 15) into the
  application's lockfile and into every other job's `npm ci`, for a tool one job runs.
- Runner variance stays a risk, mitigated rather than eliminated. Three runs plus median aggregation
  plus headroom over measured baselines means a threshold that trips is worth investigating; if one
  turns out to trip on runner load alone, the fix is to move that threshold and record why, not to
  drop the check.
- `angular.json`'s `initial` budget no longer has slack to absorb a genuine change: adding to the
  shell now means either staying under 600 kB or moving the budget on purpose. That is the intent.
- The tightened budgets bound what the *builder labels* as initial, and the builder labels the shared
  chunks `main.js` statically imports as "lazy". The login page therefore pulls ~1.08 MB of raw
  JavaScript (284 kB gzipped, three requests) while the `initial` budget only sees 424 kB of it. The
  Lighthouse transfer-size assertions are what actually bound the eager payload, which is a reason to
  keep both layers rather than treat the budgets as sufficient. Recorded as
  [#3121](https://github.com/wrk-tafel/admin/issues/3121).

## Alternatives considered

**Angular build budgets only, tightened.** Free, deterministic, no new job — and kept as a layer for
exactly that reason. Rejected as the whole answer: byte counts are a proxy that says nothing about
render or blocking time, it grades the labelled bundles rather than what the browser fetches (see the
1.08 MB above), and it produces no score, which is what the ticket asked for.

**Lighthouse CLI plus a hand-written assertion script.** Full control, one dependency, no Express 4 in
the tree. Rejected: it re-implements median aggregation, assertion levels and report generation that
`@lhci/cli` already has, and installing it into a directory of its own keeps its dependency tree out
of the application's lockfile anyway.

**`treosh/lighthouse-ci-action`.** The same `@lhci/cli` in a wrapper. Rejected for being one more
third-party action to pin and audit ([ADR-0019](0019-supply-chain-and-container-runtime-hardening.md))
in exchange for hiding two lines of `npm install` and `lhci autorun`.

**Unlighthouse** (crawls every route and rates each). Attractive on paper, and it is the natural answer
to the "per screen" gap above. Rejected for now: crawling requires an authenticated session against a
live backend, which brings back everything the login-page choice avoids, and it multiplies runtime by
the number of routes for a first iteration whose baselines nobody trusts yet.

**Web Vitals collected inside the existing Cypress e2e run.** Tempting because the e2e job already
starts a real backend with a real database and logs in, so authenticated screens would be measurable
for almost nothing. Rejected: Cypress drives an instrumented browser with its own overhead and no
throttling model, so the numbers would be neither comparable to Lighthouse's nor stable, and
performance failures would land inside a suite whose job is functional correctness.

**Real-user monitoring** (report `web-vitals` from the running application to the backend). This is the
only option that measures what users actually experience, on their hardware and network. Rejected for
this ticket, not on merit: it reports on a release after it has shipped, so it cannot fail a pipeline,
and it means collecting behavioural data about a small, identifiable group of volunteers — a privacy
decision, not a build one.

**A Lighthouse server storing history** (`upload.target: lhci`, temporary-public-storage, or
`serverBaseUrl`). Rejected: another service to run
([ADR-0003](0003-postgresql-as-the-only-infrastructure-dependency.md)) or reports pushed to a
third-party host, when a per-run artifact and a job summary answer the question.

## References

- `.github/workflows/subflow_lighthouse.yml` — the job
- `frontend/src/main/webapp/lighthouserc.cjs` — audited page, settings and thresholds
- `frontend/src/main/webapp/angular.json` — the production `budgets` block
- `frontend/src/main/webapp/src/app/common/sse/sse.service.ts` — the reconnect behaviour behind the
  never-idle network on authenticated screens
- [#3104](https://github.com/wrk-tafel/admin/issues/3104), [#3121](https://github.com/wrk-tafel/admin/issues/3121)
