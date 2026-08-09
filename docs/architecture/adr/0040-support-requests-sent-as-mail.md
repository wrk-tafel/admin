# ADR-0040: In-app support requests are sent as mail, with the browser's context attached

**Status:** accepted · **Recorded:** 2026-08-10

Supersedes [ADR-0033](0033-support-requests-become-github-issues.md).

## Context

[ADR-0033](0033-support-requests-become-github-issues.md) routed the in-app support form into this
project's GitHub issue tracker, where the people who act on reports already work. It named its own
sharpest consequence: **issues in that repository are public**, so a well-meant "Kunde Müller kann
sich nicht anmelden" publishes a name out of a system full of personal data. The GDPR analysis
([`docs/architecture/gdpr-compliance.md`](../gdpr-compliance.md)) ranked that as the single
highest-priority finding — a free-text box in a food bank's administration screen, three keystrokes
away from every household's data, posting to a public web page.

The second thing the tracker route settled for was the *content*. A report is written mid-shift by
someone with a queue in front of them, so it says what they have time to say: "geht nicht". What is
missing is exactly the part they cannot supply and the application already knows — which screen,
which build, which browser, and what failed in it a moment ago. That context could never have been
attached under ADR-0033: everything in it would have gone on the public page too
([#3144](https://github.com/wrk-tafel/admin/issues/3144)).

## Decision

**The support form sends a mail to the addresses configured for the deployment, and the mail carries
the technical context of the report.**

- `POST /api/support` takes a title, a text, and an optional `clientContext`; `SupportService`
  renders `mails/support-request-mail` and hands it to `MailSenderService.sendHtmlMailTo`. It goes
  out through the same mail server, `from` address and subject prefix as every other mail this
  application sends, and through the same queue ([ADR-0041](0041-mails-sent-through-an-outbox.md)).
- The recipients are `tafeladmin.support.recipients` — operator configuration, not a UI setting
  ([ADR-0011](0011-configuration-hot-reload-instead-of-restarts.md)). Support has to keep working
  when the thing being reported is that nobody can reach a screen to fix it.
- With no recipient configured, the endpoint fails with the same clear German "not configured"
  message as before rather than silently swallowing the request.
- The attached context is split by who can be trusted to know it. The server fills in the reporter,
  the time, the running version and build, and the environment label. The browser reports the page
  URL, the user agent, the viewport and screen size, the language and the time zone, plus the last
  20 errors of the session — HTTP failures seen by the error interceptor and uncaught errors seen by
  `TafelErrorHandler`, kept in memory by `ClientLogService`.
- The dialog says what is attached, in the dialog itself. Sending diagnostics about a person to a
  mailbox is only acceptable if the person sending it can see that they are.

## Consequences

- A report no longer leaves the organisation. It lands in a mailbox the operators choose, which is
  what makes attaching the context defensible at all — and it closes the GDPR analysis's G3.
- A report arrives answerable: screen, build, browser and the last errors are in the mail, so the
  first reply is an answer rather than a question.
- The tracker no longer gets the ticket automatically. Whoever reads the mail files the issue if it
  needs one, which is a re-typing cost ADR-0033 explicitly avoided. It buys the privacy, and a
  report that turns out to be a question rather than a bug now stops at the mailbox instead of
  becoming a public issue.
- A support request needs a configured mail server. Without one the queue skips it, exactly as for
  every other mail — see [ADR-0041](0041-mails-sent-through-an-outbox.md).
- The last-errors buffer is one more place client-side data sits, in memory only, capped at 20
  entries, and it leaves the browser only when a user chooses to send a request.
- The GitHub token — a credential with write access to this repository, held in the production
  config — is gone.

## Alternatives considered

**Keep filing issues, but in a private repository.** Rejected: it needs every reader to have an
account with access, and "private" still means a third party holds household names. The mailbox is
where the operators already are.

**Attach a screenshot of the screen.** Rejected for now: it needs a rendering library in the eager
path or an extra permission prompt, and a screenshot of a customer screen is a far larger disclosure
than the few technical fields collected here.

**Send the whole console log or a session replay.** Rejected: it collects far more than the report
needs, and the tail of errors is the part that ever gets read.

**Let users mail support directly (a `mailto:` link).** Rejected: it leaves the application, depends
on a configured mail client, and nothing technical would be attached — which is most of the point.

## References

- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/modules/support/`
- `TafelAdminProperties.TafelAdminSupportProperties`
- `frontend/src/main/webapp/src/app/common/support/` — the browser-side half
- [ADR-0041](0041-mails-sent-through-an-outbox.md) — how the mail actually leaves
- `docs/userguide/` — the support form as documented for users
