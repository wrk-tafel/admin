# ADR-0065: Open tabs ask for a new version, and the ticket monitor applies it by itself

**Status:** accepted · **Recorded:** 2026-10-04

## Context

[ADR-0029](0029-installable-pwa-with-an-explicit-update-prompt.md) made a new version prompt the
user instead of applying itself, so that "a long-lived tab no longer silently runs an old version
indefinitely". The production logs of one distribution day
([#3792](https://github.com/wrk-tafel/admin/issues/3792), item 3) show a tab doing exactly that: it
kept requesting `/api/sse/distributions` and `/api/sse/config`, endpoints that had been retired days
earlier.

Two things let it happen.

- **Nothing asked for a new version.** The Angular service worker looks for one when it starts and
  when a page is loaded. A tab that is left open loads no page again, so `VERSION_READY` — the event
  the prompt hangs on — only ever came when the browser happened to restart the worker. Since the
  event stream goes past the service worker
  ([#3791](https://github.com/wrk-tafel/admin/issues/3791)), an idle tab gives the browser no reason
  to do that at all.
- **A prompt needs somebody to press it.** The ticket monitor is a display in the hall. Nobody
  stands in front of it, and "Neu laden" on it is a snackbar the waiting customers look at.

## Decision

**Every open tab asks for a new version every 30 minutes, and a screen nobody operates reloads
itself once one is ready.**

- `SwUpdateService` calls `SwUpdate.checkForUpdate()` on an interval (`UPDATE_CHECK_INTERVAL_MS`).
  A failed check is dropped; the next one is half an hour away.
- A route marks itself with `data: {reloadOnNewVersion: true}` (`RELOAD_ON_NEW_VERSION`). On
  `VERSION_READY`, `SwUpdateService` reloads the page when the current route carries the mark and
  shows the prompt otherwise.
- The ticket monitor (`anmeldung/ticketmonitor`) is the one route marked.

This narrows ADR-0029's "prompts the user instead of applying itself silently" for that one screen.
Everywhere else the prompt stands, for the reason given there.

## Consequences

- A deployed version reaches the hall display within half an hour, without anyone touching it. The
  reload costs the display nothing: it holds no input, and the ticket-screen topic replays the
  current state to a new subscriber ([ADR-0063](0063-one-event-stream-per-tab-with-topics.md)).
- A screen somebody works on gets the prompt within half an hour of a deployment instead of at some
  later page load. Whether to reload is still theirs to decide.
- The mark is opt-in per route, and choosing it is a claim that a reload at an arbitrary moment loses
  nothing. Check-in tablets are long-lived too, but somebody is typing on them — they stay with the
  prompt.
- One request for `ngsw.json` per open tab every 30 minutes.
- None of this runs in development or under Cypress, where the service worker is off (ADR-0029), so
  it is covered by the unit spec only.
- A tab that runs a version older than this change has neither half and stays as it is until it is
  reloaded once by hand.

## Alternatives considered

- **Reloading every tab on a new version.** Rejected in ADR-0029 for discarding input, and that
  still holds for every screen with a form on it.
- **Recognising the screen by its URL inside `SwUpdateService`.** It would put a route path into a
  service that has no other reason to know one, and the next unattended screen would mean editing
  the service instead of a route.
- **Comparing the running version against `/api/config`'s.** The `config` topic already carries the
  release version, so a tab could notice a deployment the moment the stream reconnects. But a reload
  only helps once the service worker has the new files, which is what `VERSION_READY` says and a
  version number does not — reloading earlier serves the old shell from its cache again.
- **Asking more often.** A deployment is not urgent to a tab that works; half an hour is well inside
  "the same day" and costs next to nothing.

## References

- [#3792](https://github.com/wrk-tafel/admin/issues/3792), item 3
- [ADR-0029](0029-installable-pwa-with-an-explicit-update-prompt.md)
- `frontend/src/main/webapp/src/app/common/pwa/sw-update.service.ts`
- `frontend/src/main/webapp/src/app/app.routes.ts`
