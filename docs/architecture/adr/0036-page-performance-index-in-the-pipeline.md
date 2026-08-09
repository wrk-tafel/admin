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
  to its `maxWaitForLoad` cap instead. Blocking the SSE URLs lets a run settle again, but not for
  free: `SseService` retries a blocked stream with a delay doubling from 1s to a 30s ceiling, so
  quiet only arrives once the gap between two retries exceeds Lighthouse's quiet window — around
  fifteen seconds into every run.

## Decision

**A `lighthouse` pipeline job rates the built frontend with Lighthouse CI and fails when a threshold
is crossed, in two parts: the shell's performance is gated on the login page served statically, and
every route of the application is swept for accessibility on desktop and mobile against a real
backend. Angular's build budgets are tightened to bound the build output as a third, deterministic
layer.**

The split follows from what each measurement can honestly answer. Load cost is a property of the
shell and is measured where it can be measured cold and repeatably; accessibility is a property of
each screen's markup and is measured on each screen.

**`shell` — the gate on load cost.** `.github/workflows/subflow_lighthouse.yml` downloads the same
`frontend-dist` artifact the image is built from, and `lhci autorun` serves it from its own static
server (gzip, SPA fallback). The job needs no backend jar, no database and no `npm ci` — only Node
and the runner's Chrome, and it finishes in about a minute.

- Three runs per audit; the median run is what assertions and the report are taken from, so a busy
  runner does not decide the outcome and every number in a failure comes from one page load.
- The **desktop** preset: the payload this measures is identical on every device, and the desktop
  environment is the one this application is actually used in. The mobile rendering of the app is
  covered by the sweep below.
- Thresholds in `frontend/src/main/webapp/lighthouserc.cjs`, each recorded next to the baseline it was
  derived from: performance ≥ 0.9 and accessibility = 1.0 as errors, best practices ≥ 0.9 as a
  warning, FCP ≤ 1.5s, LCP ≤ 2s, CLS ≤ 0.1, and transfer-size ceilings for script, font and total
  bytes.
- Best practices is only a warning because part of that category grades the *server* (cache headers,
  CSP, HTTPS) and the server in this job is lhci's static one, not the container that serves the
  files in production.

**`pages` — the sweep over every route.** A matrix job boots the same stack the e2e job does — a
Postgres service and the jar under the `e2e` profile, which also serves the frontend bundle and its
SPA fallback (`IndexHtmlController`) — and audits every route of the application, in both form
factors, sharded so the sweep runs in parallel rather than end to end.

- **The session is a cookie in the browser's jar, not a scripted login and not a request header.**
  `POST /api/login` yields the `tafel-admin-jwt` cookie for the `e2etest` fixture user, which holds
  every permission, and `lighthouse-session.cjs` — lhci's `puppeteerScript` hook, run once per
  audited URL — writes it into the browser before Lighthouse navigates. The application loads its
  user info from `GET /api/users/info` while bootstrapping, so that is all an authenticated route
  needs. A header cannot do this job: Chrome rebuilds the `Cookie` header of every request from its
  own jar, so a cookie set through Lighthouse's `extraHeaders` never reaches the server. That is
  also why `disableStorageReset` is on — Lighthouse would otherwise clear the origin's data, and the
  session with it, before each run. It does not warm the cache; Lighthouse disables the HTTP cache
  for the measured navigation either way.
- **The sweep verifies that it was actually authenticated.** Every failure above is silent by
  construction: an unauthenticated sweep redirects each route to the login page and then passes
  every threshold, having graded one screen thirty times. The job therefore compares each report's
  final URL against the URL it requested and fails on any difference, which is the one check that
  distinguishes "these routes are clean" from "these routes were never opened".
- **The SSE streams are blocked** (`blockedUrlPatterns`), which is what lets a run reach network-idle
  at all; see the context above for why that costs about ten seconds per page rather than nothing.
  An active distribution is started before the sweep, so the dashboard and the check-in screens
  render their real content instead of their "no distribution" placeholder.
- **Desktop and mobile**, because the application is responsive — the settings and customer screens
  fall back to card layouts below the table breakpoint, and audits like tap-target sizing only mean
  anything under mobile emulation.
- **Accessibility = 1.0 is the only error.** Those audits grade the markup, not the machine: they
  give the same answer on a loaded runner as on a developer laptop, which is what makes them worth
  enforcing on thirty-odd routes where a performance threshold would only produce noise.
- **Performance and best practices are reported, not gated.** An authenticated screen renders
  whatever the e2e fixtures hold, so its score moves when the test data moves. The numbers go into
  the job summary as a trend; what blocks is the shell audit above, whose payload every one of these
  routes also pays.
- The route list is the workflow's matrix. Nothing derives it, so **a new route has to be added
  there** — that is the maintenance cost this buys with.
- The tool version is pinned in the workflow (`LHCI_VERSION`), which fixes the Lighthouse version with
  it (`@lhci/cli` 0.15.1 depends on exactly `lighthouse` 12.6.1), because a Lighthouse upgrade moves
  scores on unchanged code. The job installs that pinned version into a directory of its own with
  `--ignore-scripts` rather than letting `npx` resolve and execute a package on demand
  ([ADR-0019](0019-supply-chain-and-container-runtime-hardening.md)), so neither the application's
  `package.json` nor its `node_modules` are involved. The sweep adds a pinned `puppeteer-core`
  (`PUPPETEER_VERSION`) in the same directory, for the cookie above — `puppeteer-core` and not
  `puppeteer` because it is the same API without a bundled Chromium download, and the runner already
  has a Chrome for it to drive.
- Every job uploads both its HTML and its JSON reports as a `lighthouse-reports-*` artifact and
  writes its scores into the job summary — on failure too, which is when they are wanted.
- Build budgets in `angular.json` are tightened to sit just above what the build actually produces:
  `initial` 480 kB / 600 kB (actual 424 kB), `anyScript` 600 kB / 800 kB (largest chunk 533 kB),
  `allScript` 3.2 MB / 4 MB (actual 2.7 MB).
- Both jobs are gated on the frontend having changed, not on the application as a whole: a
  backend-only change ships a byte-identical bundle. Neither is a dependency of the deployment jobs —
  a page-performance threshold is a signal to act on, not a reason to withhold a merged change from
  the test environment.

Gating load cost on the login page is a deliberate choice, not a limitation worked around. It is the
one screen that is anonymous and SSE-free, so it can be measured cold, repeatably, without a
database; and what it measures — the shell every other route also pays for — is the number that
actually moves when someone adds a dependency.

## Consequences

- First-load cost has a number attached, a report to open, and a threshold that blocks. A regression
  shows up in the pull request that caused it.
- **Accessibility is now enforced on every screen, in both form factors** — the first automated check
  in this repository that grades the rendered markup of each route rather than the code behind it. A
  screen that ships an unlabelled control or a broken heading order fails the pull request that
  introduced it.
- **A route that is not in the matrix is not audited, and nothing says so.** The list is maintained by
  hand next to the shards; a new screen added without a line there is silently uncovered. The
  alternative — deriving the routes from `app.routes.ts` at build time — needs the parameterised
  routes (`detail/:id`) filled from fixtures anyway, which is the part that cannot be derived.
- **The sweep's performance numbers are a trend, not a gate.** They depend on the `e2e` fixtures the
  screens render, so a fixture change moves them without any application change. Turning one into a
  threshold means accepting that coupling for that screen and writing down its baseline. The mobile
  numbers are the ones worth watching: under Lighthouse's mobile emulation the heavier screens land
  well below the desktop scores, `/einstellungen/email` lowest of them.
- **Best practices sits at 0.96 across the sweep and that is the harness, not the application.**
  Blocking the SSE streams makes `SseService` log a connection error, and `errors-in-console` counts
  it. The number is worth reading only for a *new* console error appearing next to that one.
- **Load cost is still only measured for the shell.** A lazily-loaded route chunk that doubles in size
  is caught by the `anyScript` build budget and shows up in the sweep's reported numbers, but nothing
  blocks on it.
- The sweep costs a Postgres service and a backend boot per shard, in exchange for auditing every
  route on every frontend pull request. It is the pipeline's widest job by runner count; the shard
  layout is what keeps its wall clock next to the e2e job's rather than far beyond it.
- **Absolute numbers from these jobs are not production numbers.** Neither lhci's static server nor a
  locally started jar is the container behind its reverse proxy, and localhost is not the network.
  What they can compare honestly is one commit against the next, on the same setup.
- The Lighthouse and puppeteer pins are maintained by hand. Dependabot does not see them,
  deliberately: as frontend `devDependencies`, `@lhci/cli` would drag its transitive tree (Express 4,
  yargs 15) into the application's lockfile and into every other job's `npm ci`, for tools one job
  runs. The cost is that a Chrome on the runner far newer than the pinned `puppeteer-core` is a
  breakage this repository finds out about from a red `pages` job rather than from a pull request.
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

**Unlighthouse** (crawls every route and rates each). The closest thing to an off-the-shelf version of
the `pages` sweep, and it would have removed the hand-maintained route list. Rejected: it discovers
routes by following links, so the parameterised screens (`/kunden/detail/:id`,
`/kunden/zusammenfuehren/:id?quellen=…`) are reachable only if some rendered page happens to link to a
fixture that exists — the coverage would be whatever the crawler stumbled into, which is exactly what
an explicit list makes checkable. It is also a second tool with its own Lighthouse version to pin
next to `@lhci/cli`, and its assertion model is per-route thresholds rather than the
`aggregationMethod`/level split used here.

**One shard, every route, no matrix.** Simpler workflow and one Postgres instead of eight. Rejected on
wall clock: thirty-odd routes in two form factors, each needing about ten seconds of SSE backoff
before Lighthouse can call the page loaded, is roughly half an hour on the critical path of every
frontend pull request.

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

- `.github/workflows/subflow_lighthouse.yml` — both jobs, and the route list the sweep covers
- `frontend/src/main/webapp/lighthouserc.cjs` — the shell audit's settings and thresholds
- `frontend/src/main/webapp/lighthouserc.pages.cjs` — the sweep's session, SSE handling and assertions
- `frontend/src/main/webapp/lighthouse-session.cjs` — the cookie that makes the swept routes render
- `frontend/src/main/webapp/angular.json` — the production `budgets` block
- `backend/src/main/resources/db-migration-testdata/testdata.sql` — the fixtures the swept screens
  render, and the ids the parameterised routes use
- `frontend/src/main/webapp/src/app/common/sse/sse.service.ts` — the reconnect behaviour behind the
  never-idle network on authenticated screens
- [#3104](https://github.com/wrk-tafel/admin/issues/3104), [#3121](https://github.com/wrk-tafel/admin/issues/3121)
