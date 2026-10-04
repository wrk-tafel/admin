# ADR-0064: Client-error reports and the event stream need a completed login

**Status:** accepted · **Recorded:** 2026-10-04

## Context

Two things the frontend does in the background, without a user asking for either, are tied to a
session the server accepts: the event stream ([ADR-0063](0063-one-event-stream-per-tab-with-topics.md))
and the automatic client-error report ([ADR-0053](0053-client-side-errors-logged-automatically-to-app-log.md)).
Neither knew whether such a session exists.

The production logs of one distribution day ([#3791](https://github.com/wrk-tafel/admin/issues/3791))
show what that costs:

- `ConfigApiService` subscribes to the `config` topic for as long as the page lives, so
  `SseService` went on asking for a stream after a logout and while a login still owed its second
  factor - every 30 seconds, the reconnect backoff's cap. `MfaPendingFilter` refuses each one, the
  refusal was recorded as a client error, and its report was refused as well: three refused requests
  and four log lines per attempt, for as long as the code page was open.
- A logged-out tab left open overnight asked 3,275 times for a stream it could not get.
- ADR-0053 reports *every* entry `ClientLogService` records, and the HTTP error interceptor records
  every failed request. A customer number nobody has, a wrong second-factor code and the `401` every
  visitor gets from `GET /api/users/info` before logging in are answers the screens handle, not
  failures - but each became a `WARN "Client-Fehler"` line in `app.log`, which is supposed to be the
  place where a real client-side failure is discoverable.

## Decision

**Background traffic waits for a completed login.** `AuthenticationService.hasCompletedLogin()` -
logged in, no code owed, no second factor left to set up - is the one rule, and it is the state in
which `MfaPendingFilter` lets a request through.

- `SseSessionService` (`common/sse/sse-session.service.ts`) switches `SseService` off outside that
  state (`setEnabled`). Subscriptions are kept, no request is made, and the stream is opened for
  whatever is subscribed once a login completes.
- A stream the server refuses makes `SseSessionService` ask `GET /api/users/info` whether the
  session still exists. `EventSource` does not expose the status of a refusal, and a tab nobody
  touches makes no other request that could find out. A `401` ends the session in the tab too, which
  sends it to the login page and - by the rule above - stops the retries. Any other answer changes
  nothing: a backend that is restarting is not an expired session.
- `ClientErrorReportingService` sends nothing outside that state. The entry stays in
  `ClientLogService`'s buffer for a support request and is not marked as reported.

**A status the caller expects is not an error.** `EXPECTED_ERROR_STATUSES`
(`common/http/suppress-client-log-record.token.ts`, set through `expectedErrorContext(...)`) names
the statuses a request's caller treats as an ordinary answer; the interceptor neither records nor
toasts those. Any other status of the same request is recorded as before. It is set on the lookups
by number that fall back on a `404` (check-in, customer search, user search), on the login (`403`,
`429`), on the code check (`400`, `429`) and on the session check (`401`).

This narrows ADR-0053's "reports every entry it records" in both directions: fewer things are
recorded, and what is recorded before a login completes is no longer sent. Everything else in
ADR-0053 stands.

## Consequences

- A logged-out tab, and one waiting for a code, make no request at all until someone acts in them.
- An error on the login page reaches `app.log` only through a support request. That was already the
  outcome - the report was refused with a `401` - so nothing is lost, the refused request is just no
  longer made.
- A new request whose caller handles a status as a normal result has to say so with
  `expectedErrorContext(...)`; `SUPPRESS_ERROR_TOAST_CONTEXT` alone still records it. Nothing
  enforces that - the cost of forgetting is a noisy log line, which is how these were found.
- The declaration is per status on purpose. A lookup that expects a `404` and gets a `500` is still
  a failure worth a log line, which a blanket "do not record this request" would hide.
- `SseService` has an on/off switch it cannot work out by itself: the authentication service depends
  on it (through `GlobalStateService`), so the dependency cannot point the other way. A test or a
  context without `SseSessionService` gets a stream that is simply always on.
- One extra `GET /api/users/info` per refused stream, at most one per reconnect attempt and so
  bounded by the same backoff.

## Alternatives considered

- **Unsubscribing every topic on logout.** That is what `GlobalStateService.reset()` does for its
  own two topics, and it is how the `config` subscription was missed: it relies on every
  long-lived subscriber knowing about the logout. A switch on the one connection cannot be forgotten
  by the next subscriber.
- **Stopping the reconnect after a number of failures.** It cannot tell an expired session from a
  deployment, and a tab that gave up during a restart would stay without live updates until someone
  reloads it - on the ticket monitor, during a distribution.
- **Dropping the reports server-side instead.** The requests would still be made and still be
  refused; the noise is the requests themselves, not only what they log.
- **Opening `/api/client-errors` to anonymous callers.** Rejected in ADR-0053 for being a public way
  to write into the application log, and nothing here changes that.

## References

- [#3791](https://github.com/wrk-tafel/admin/issues/3791), sections 3-5
- [ADR-0053](0053-client-side-errors-logged-automatically-to-app-log.md),
  [ADR-0058](0058-two-factor-authentication-gates-the-session-not-the-page.md),
  [ADR-0063](0063-one-event-stream-per-tab-with-topics.md)
- `frontend/src/main/webapp/src/app/common/sse/sse-session.service.ts`, `sse.service.ts`
- `frontend/src/main/webapp/src/app/common/support/client-error-reporting.service.ts`
- `frontend/src/main/webapp/src/app/common/http/errorhandler-interceptor.service.ts`
