# ADR-0034: One error contract — RFC 7807 out of the backend, a German toast in the frontend

**Status:** accepted · **Recorded:** 2026-08-09

## Context

The people using this system are volunteers mid-task, not developers. An error has to tell them what
went wrong in a sentence they can act on — "Ausgabe bereits gestartet!", not `500 Internal Server
Error` and not `NullPointerException`.

Getting there needs two things to line up. The backend must produce a status *and* a usable message
at the point where it knows what went wrong, and the frontend must show that message without every
one of hundreds of call sites writing its own error handling. Left to conventions, both halves drift:
statuses get picked wrongly at throw sites, and half the screens show a message while the other half
fail silently.

There is a security angle too. The paths that report errors — access denied, bad request — are by
definition reachable by anyone who can send a request at all, and they log request-derived data.

## Decision

**Errors are a contract: a typed exception hierarchy that fixes its own status, rendered as RFC 7807
`ProblemDetail`, surfaced by a single frontend interceptor with a per-request opt-out.**

Backend:

- `TafelApiException` extends Spring's `ErrorResponseException` and carries a `ProblemDetail`.
  **Each subclass fixes its own status in its constructor** — `NotFoundException` (404),
  `ConflictException` (409), `BusinessRuleException` (400, overridable to e.g. 422) — so a status can
  no longer be forgotten or defaulted wrongly at a throw site.
- The `detail` is the German, user-facing sentence, written where the failure is understood.
- `GenericExceptionHandler` overrides `handleExceptionInternal`, the hook every default handler in
  `ResponseEntityExceptionHandler` funnels through, so the message the exception was constructed with
  is what reaches the client — rather than a framework-generated body or a bare message code.
- Bean-validation failures are rendered as a list of `FieldErrorItem(field, message)`, so a form can
  place each message on its field.
- `AccessDeniedException`'s own message ("Access Denied") is English and says nothing actionable, so
  it is replaced deliberately.
- Anything request-derived that goes into a log line on these paths is passed through
  `sanitizeForLog`, which strips CR/LF. Without it a forged newline can smuggle a fake log entry
  (CWE-117) into a path anyone can reach.

Frontend — one interceptor, three chained stages, and it **never swallows an error**, it only reacts
before re-throwing:

1. A `401` while authenticated ends the session and redirects — unconditional and cross-cutting.
2. For `responseType: 'blob'` requests (PDF downloads), the JSON error body Angular delivers as a
   `Blob` is remapped so the message is readable.
3. A toast shows the backend's message, unless the request carries `SUPPRESS_ERROR_TOAST` — the
   opt-out for call sites that fully own presenting the error (inline form validation, a confirm
   dialog, a deliberately silent background request).

`ConnectivityService` complements this with `navigator.onLine` as a cheap signal — explicitly *not* a
statement about whether the backend is reachable.

## Consequences

- A message written once at the throw site reaches the user unchanged. That is what makes the errors
  in this application German sentences instead of stack-trace residue.
- New code gets correct behaviour by default: throw the right exception type, and the status, body
  and toast follow. Nothing has to be wired per endpoint or per screen.
- `ProblemDetail` is a standard media type, so the shape is documented by RFC rather than by this
  repository.
- **The `detail` string is user-facing output.** It must not carry internal identifiers, SQL, or
  personal data, because it is rendered verbatim in a toast — a discipline that is easy to forget
  when adding an exception in a hurry.
- The opt-out is a per-request context token, so silencing a toast is visible at the call site rather
  than configured globally. Its shared `SUPPRESS_ERROR_TOAST_CONTEXT` constant must never have
  `.set()` called on it — `HttpContext` mutates in place, and doing so would leak context into every
  other request using the constant.
- The 401 redirect deliberately stays outside the opt-out. A screen cannot accidentally suppress
  "your session has expired".
- Log sanitisation applies only where it is called. It is a rule about writing request-derived data
  into logs, not something the framework enforces.
- `navigator.onLine` cannot distinguish "no network" from "backend unreachable" (a captive portal
  reports online), so request failures still have to be handled — the signal is a hint, not a
  guarantee.

## Alternatives considered

**Return bare status codes and let the frontend map them to messages.** Rejected: the frontend does
not know *why* a 409 happened, so the mapping would be per endpoint and would drift from the backend
rule that produced it.

**A custom error-body format.** Rejected: `ProblemDetail` is already what Spring produces and what
RFC 7807 specifies; a bespoke shape would need its own documentation for no gain.

**One exception type with a status parameter.** The previous shape, and rejected because an optional
status defaulting to 400 is a status that gets forgotten. Fixing it per subclass makes the correct
code unavoidable.

**Per-component error handling.** Rejected: hundreds of call sites, each an opportunity for a silent
failure. The inversion — handle centrally, opt out explicitly — makes the exception visible instead
of the rule.

**English messages with frontend translation.** Rejected: there is one locale
([ADR-0027](0027-single-locale-and-timezone.md)), so a translation layer would add indirection with
no second language to serve.

## References

- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/modules/base/exception/` — `TafelExceptions.kt`,
  `GenericExceptionHandler.kt`
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/common/LogSanitizer.kt`
- `frontend/src/main/webapp/src/app/common/http/errorhandler-interceptor.service.ts`,
  `suppress-error-toast.token.ts`
- `frontend/src/main/webapp/src/app/common/connectivity/connectivity.service.ts`
</content>
