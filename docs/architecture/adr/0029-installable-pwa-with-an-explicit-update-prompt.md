# ADR-0029: An installable PWA with an explicit update prompt

**Status:** accepted · **Recorded:** 2026-08-09

## Context

Part of this application does not run on a desk. The ticket screen is a display in the distribution
hall, and check-in runs on tablets — devices that are switched on before the distribution and left
alone for hours. A browser tab with an address bar is the wrong shape for that, and so is a tab that
keeps running whatever version it happened to load when someone opened it in the morning.

There is a second, smaller problem: dev, test and prod share one origin at different path prefixes
([ADR-0002](0002-single-deployable-image-with-independent-builds.md)). Installed as home-screen apps,
three environments called "Tafel Admin" are indistinguishable.

## Decision

**The frontend is a Progressive Web App with a service worker, and a new version prompts the user
instead of applying itself silently.**

- `provideServiceWorker('ngsw-worker.js')` with `registrationStrategy: 'registerWhenStable:30000'`.
  The app shell (`index.html`, CSS, JS, manifest, favicon) is prefetched; images and fonts are cached
  lazily.
- It is **enabled only in production builds, and explicitly disabled under Cypress** — an active
  worker serves navigations from its own cache, bypassing Cypress's network layer, which made
  `cy.visit()` unreliable once a prior test had let the worker take control.
- `SwUpdateService` listens for `VERSION_READY` and shows a snackbar with a "Neu laden" action rather
  than reloading on its own.
- `IndexHtmlController` stamps the environment label into the page title, the manifest's `name` and
  `short_name`, and `apple-mobile-web-app-title`, using two brandings: a long one for the browser tab
  and install prompts, a short one ("Tafel DEV") for the home-screen label, which platforms truncate
  at around twelve characters.

## Consequences

- The hall devices run a full-screen, installed app with its own icon, and the shell loads from cache
  instead of over the network on every start.
- **A long-lived tab no longer silently runs an old version indefinitely** — the whole reason the
  update prompt exists. A kiosk screen that is never closed would otherwise keep the version it
  booted with until someone reloaded it by hand.
- Prompting rather than auto-reloading is deliberate: reloading under someone's hands, mid-check-in,
  would lose whatever they were entering. The trade is that a user can dismiss the prompt and stay on
  the old version.
- A service worker is a cache that outlives a deploy, which makes "did this device get the new
  version?" a question that can now be asked. The prompt is the answer, but it depends on the worker
  noticing — a device that never regains network stays where it is.
- The Cypress exemption is a real coupling between production behaviour and test infrastructure. It
  is narrow (`window.Cypress` is only defined inside a Cypress run) and it is the reason e2e runs are
  reproducible.
- Per-environment branding has to be injected server-side, because the frontend is built once and
  deployed unchanged — which is why it lives in `IndexHtmlController` rather than in a build-time
  environment file.
- Offline support is shallow by design: the shell is cached, the data is not. The app does not work
  without the backend, and nothing here pretends otherwise.

## Alternatives considered

**A plain SPA with no service worker.** Rejected: no install, no app shell caching, and no way to
tell a long-lived screen that a new version exists.

**Auto-reload on a new version.** Rejected: it would discard in-progress input at an arbitrary moment,
which on a check-in tablet means losing someone's data mid-registration.

**A native or wrapped app for the hall devices.** Rejected: an app store, a build per platform and a
separate release path, to gain nothing over an installed PWA on hardware that is already a browser.

**Full offline operation with local writes and sync.** Rejected: distribution state is inherently
shared and contended (ticket queue, check-ins), so offline writes would need conflict resolution for
a case that a stable local network already handles.

## References

- `frontend/src/main/webapp/src/app/app.config.ts`, `ngsw-config.json`
- `frontend/src/main/webapp/src/app/common/pwa/sw-update.service.ts`
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/config/IndexHtmlController.kt`
- [#3027](https://github.com/wrk-tafel/admin/issues/3027) — per-environment branding
</content>
