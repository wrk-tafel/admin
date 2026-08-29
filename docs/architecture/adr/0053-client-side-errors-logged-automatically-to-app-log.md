# ADR-0053: Client-side errors are logged automatically to `app.log`

**Status:** accepted · **Recorded:** 2026-08-29

## Context

[ADR-0044](0044-support-requests-sent-as-mail.md) gave the frontend a full client-error-capture
stack: `ClientLogService` keeps a rolling buffer of the session's last 20 errors — HTTP failures,
uncaught Angular errors, and what neither of those two ever sees, via `window` listeners
(`captureGlobalErrors`) — and attaches it to a support request as `recentErrors`. That buffer only
ever leaves the browser when a user notices something is wrong and chooses to write a report about
it ([#3512](https://github.com/wrk-tafel/admin/issues/3512)). A failure nobody happens to notice, or
one a user shrugs off and works around, stays invisible - there is no way to discover it from the
backend side at all.

## Decision

**`ClientLogService` also reports every entry it records to a new authenticated endpoint,
`POST /api/client-errors`, which logs it to `app.log` at `WARN` under a dedicated logger name
(`at.wrk.tafel.admin.backend.CLIENT_ERROR`) so it can be grepped/alerted on separately from the rest
of the file's `WARN` traffic.**

- `ClientLogService.record()` now also emits the entry on a new `onRecord` observable, in addition
  to appending it to the buffer as before. `ClientErrorReportingService`
  (`frontend/.../common/support/`) subscribes to it at startup (same
  `provideAppInitializer` pattern as `captureGlobalErrors`) and reports each entry via
  `ClientErrorApiService`.
- `captureGlobalErrors()` also now wraps `console.warn`, so a degraded-but-handled situation logged
  that way (a chime that couldn't play, a screen wake lock that couldn't be acquired, an SSE stream
  reconnecting) reaches the log too, not only an uncaught exception. `console.error` is deliberately
  left unwrapped: Angular's own default `ErrorHandler` logs an uncaught error via `console.error`
  internally, and `TafelErrorHandler` already records that same error explicitly before forwarding to
  it - wrapping `console.error` as well would record (and then report) every uncaught error twice. A
  raw `console.error(...)` call made directly by app code (outside `TafelErrorHandler`, e.g. in
  `SseService`) is therefore still not captured - the same gap that existed before this ADR.
- The request body (`ClientErrorReportRequest`, `backend/.../modules/support/model/`) is
  deliberately smaller than a support request's `clientContext`: `message`, `page` and `userAgent`
  only - no screenshot, no viewport/screen/language/timezone, no stack trace. This goes out
  automatically rather than behind an explicit "send" action a user has reviewed, so it carries less
  than the thing a user consciously chose to attach.
- `page` is built the same way `SupportContextService` already does -
  `location.origin + location.pathname`, never `location.href` - so a search term or any other query
  string never leaves the browser this way either (GDPR gap G25,
  [#3506](https://github.com/wrk-tafel/admin/issues/3506)).
- The endpoint sits in the `support` module, next to the mail-based flow, since both are the same
  bounded context - what the browser tells the backend about its own health - just two different
  destinations (a mailbox a human reads, versus `app.log`). It requires `isAuthenticated()`, the
  same posture as `/api/support`, and gets its own `RateLimitFilter` scope (`clientError`) in
  `WebSecurityConfig` for the same reason ADR-0044's context notes about `/api/support`: an
  authenticated call can still be cheap to spam, and this one fires automatically rather than by a
  deliberate user action.
- The frontend adds a second, independent backstop on top of the per-IP rate limit:
  `ClientErrorReportingService` reports an identical message only once per session, and never sends
  more than 20 reports per session regardless of how many distinct messages are seen. A broken
  render loop throwing the same error every frame is caught by the first; a loop whose message
  differs slightly on every occurrence (e.g. embeds a household id) is caught by the second.
- A failed report (network error, `429`, `401` for a not-yet-logged-in session) is swallowed
  silently - it is best-effort, not itself something the reporter caused or can act on - and is
  excluded from `ClientLogService`'s own buffer via a new `SUPPRESS_CLIENT_LOG_RECORD` request
  context, the same mechanism `SUPPRESS_ERROR_TOAST` already uses for the generic error toast.
  Without it, a rate-limited report would record itself as a new client-log entry, which would then
  be reported in turn - an unbounded loop the per-session cap above would only ever paper over.

## Consequences

- A client-side failure is discoverable from `app.log` without anyone having noticed it and written
  a support request first - the actual gap this closes.
- `app.log` now receives free-form browser-supplied text (an error's `message`) automatically,
  rather than only when a user reviewed and chose to send it in a support mail. The message is
  capped at 1000 characters and newline-sanitized (`sanitizeForLog`, guards against one client error
  forging extra-looking log lines), but its content is otherwise whatever the browser threw - the
  same residual risk ADR-0044 already accepted for `recentErrors` in a support mail, now also
  present in `app.log`. `docs/architecture/gdpr-compliance.md`'s summary of what lands in `app.log`
  is updated to say so.
- No new retention mechanism is needed: this is one more thing `logging.logback.rollingpolicy`
  bounds (10MB/file, 7 files, 100MB cap), the same rollover every other `app.log` line is already
  subject to.
- One more authenticated endpoint with its own rate-limit scope to keep in mind alongside
  `/api/login` and `/api/support` when reasoning about `RateLimiterIpService`'s shared token-bucket
  budget per IP.
- A client error that happens before login (e.g. on the login page itself) is still captured in the
  in-memory buffer as before, but the automatic report to the backend fails with a `401` and is
  dropped - `isAuthenticated()` was kept consistent with `/api/support` rather than opening a public,
  unauthenticated log-injection surface for this.

## Alternatives considered

**Make the endpoint public so pre-login errors are also captured.** Rejected: it would be the one
endpoint besides `/api/login` and `/api/config/public` reachable by anyone on the internet, turning a
diagnostics feature into a public, unauthenticated way to write arbitrary (if capped and sanitized)
text into `app.log` at will. A login-page failure is also the one class of bug most likely to be
reported through some other channel (it blocks everything), unlike the errors this feature actually
targets - the ones nobody notices.

**Batch several entries into one request instead of one request per error.** Rejected for the
added complexity: the per-session dedup and hard cap already bound the worst case to at most 20
requests per session, and the per-IP rate limiter is the actual backstop regardless of how many
requests one session produces it within its budget.

**Reuse `/api/support` itself, sending a minimal "report" with no title/text.** Rejected: it would
still create a mail via `SupportService`, one per client error, which is a much larger blast radius
(mail volume, `mail_outbox` storage) for something that only needs a log line.

## References

- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/modules/support/ClientErrorController.kt`
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/modules/support/internal/ClientErrorLogService.kt`
- `frontend/src/main/webapp/src/app/common/support/client-error-reporting.service.ts`
- `frontend/src/main/webapp/src/app/common/support/client-log.service.ts`
- [ADR-0044](0044-support-requests-sent-as-mail.md) - the existing client-error-capture stack this
  builds on
- `docs/architecture/gdpr-compliance.md`
- [#3512](https://github.com/wrk-tafel/admin/issues/3512)
