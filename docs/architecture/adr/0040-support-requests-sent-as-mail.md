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
- **A screenshot of the page is attached as `screenshot.jpg`**, captured by `ScreenshotService`
  (`html-to-image`, loaded on demand) **before the dialog opens**, so what the mail shows is the
  screen being reported rather than the dialog reporting it. It is scaled to at most 1280px wide and
  retried at a lower quality once if it exceeds ~2MB; if it is still too large, or the capture fails
  for any reason, the request goes out without it — the picture is a best-effort extra, never a
  precondition. The server treats it the same way: a screenshot it cannot decode costs the mail its
  attachment, not the report.
- The dialog says what is attached, in the dialog itself, **shows the screenshot** and offers a
  checkbox to leave it out. Sending diagnostics about a person to a mailbox is only acceptable if
  the person sending it can see what they are sending and can decide against it.

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
- **The screenshot is the largest disclosure this feature makes.** A report written on a customer
  detail screen mails that customer's name, address and income figures as a picture, to a mailbox
  with its own retention nobody here controls. That is exactly why it is previewed and switchable in
  the dialog, why it goes only to the organisation's own addresses, and why it is called out in the
  user guide — and it is the reason this decision was only possible once the destination stopped
  being a public issue tracker.
- A mail carrying a screenshot is up to ~2MB, stored in `mail_outbox` until the cleanup window
  passes ([ADR-0041](0041-mails-sent-through-an-outbox.md)).
- One more frontend dependency (`html-to-image`), dynamically imported so it stays out of every
  bundle until support is actually opened.
- The GitHub token — a credential with write access to this repository, held in the production
  config — is gone.

## Alternatives considered

**Keep filing issues, but in a private repository.** Rejected: it needs every reader to have an
account with access, and "private" still means a third party holds household names. The mailbox is
where the operators already are.

**Attach the screenshot without asking, and without showing it.** Rejected: it is the one attached
asset that can carry a customer's whole record, and a reporter who cannot see it cannot judge
whether to send it. The preview plus the checkbox costs one component and settles that.

**Capture the screenshot when the request is submitted rather than when the dialog opens.**
Rejected: by then the dialog is on top of the page and would be most of the picture. Capturing on
the button click gets the screen the report is actually about, with nothing to filter out.

**Use the browser's Screen Capture API (`getDisplayMedia`) instead of a rendering library.**
Rejected: it prompts for a permission and a window choice every single time, mid-shift, to produce
the same picture.

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
