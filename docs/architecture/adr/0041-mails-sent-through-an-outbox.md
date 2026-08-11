# ADR-0041: Mails are queued in the database and sent by a poller

**Status:** accepted · **Recorded:** 2026-08-10

## Context

Every mail this application sends used to go out with an SMTP call inside the transaction that
produced it: closing a distribution rendered the daily report PDF, built the statistics CSVs and
handed all of it to the mail server before the request finished. That couples a business transaction
to a server this application does not control, and it fails in three ways:

- **A slow mail server makes the application slow.** The close of a distribution — done at the end
  of a shift, with people waiting — waits for SMTP.
- **An unreachable mail server loses the mail.** The transaction was committed, the report was
  rendered, the send threw, and the only trace was a stack trace in the log. Nobody was told, and
  there was nothing left to retry from.
- **A rolled-back transaction could still have sent a mail** — a mail about work that did not
  happen.

The application already answers the mirror image of this problem for server-sent events with an
outbox: `SseOutboxService` writes the event as a row in the same transaction as the work, and
delivery happens afterwards, from that row.

## Decision

**A mail is written to a `mail_outbox` row inside the transaction that produced it, and handed to the
mail server afterwards by a scheduled poller.**

- `MailSenderService` composes the mail exactly as before — subject prefix, `from`, recipients,
  attachments, inline logo — and then calls `MailOutboxService.enqueue` instead of `JavaMailSender.send`.
- The row stores **the finished MIME message** as `bytea`, not its ingredients. It is what the mail
  server gets either way, it cannot drift from what the composing code meant, and a report's
  attachments stay in the row of the mail they belong to. Subject and recipients are duplicated into
  their own columns purely so the queue can be read — in a log line or in the database during a
  support call — without parsing MIME.
- `MailOutboxService.sendPendingMails` polls every `tafeladmin.mailOutbox.interval` (default 10s),
  takes the due rows oldest-first and sends them. A failure is retried with a growing backoff and,
  after 5 attempts, the row is parked as `FAILED` **with the error kept**. Sent rows are deleted
  after 14 days, like the SSE outbox's.
- Each mail's outcome is saved on its own, so one failing mail cannot roll back the outcome already
  recorded for the others in the batch.
- With no mail server configured (dev, test, the e2e run) nothing is queued at all — the same
  silent no-op as before, rather than a queue that fills up with mail nobody can send.

Polling rather than `pg_notify`, unlike the SSE outbox: nothing here is latency-critical, and a poll
is also what picks up a retry and a row left behind by a crash — a notification can do neither.

## Consequences

- A distribution close no longer waits for SMTP, and an SMTP outage or an application restart no
  longer loses a report. It goes out when the server comes back.
- A mail nobody received is now a row somebody can find, with the error that stopped it, instead of
  a line in a log file.
- A mail arrives up to one poll interval late. For a daily report or a support request that is
  nothing; anything that ever needs to be immediate does not belong in a mail.
- Attachments are stored twice for the lifetime of the row — once in the queue, once in whatever
  produced them. Bounded by the 14-day cleanup.
- **Two application instances would send every queued mail twice.** This deployment runs one
  container ([ADR-0019](0019-supply-chain-and-container-runtime-hardening.md)); a second instance
  would need a `FOR UPDATE SKIP LOCKED` claim on the batch first. That lock is
  [ADR-0045](0045-one-mail-per-transaction-taken-with-skip-locked.md).
- A mail is queued only if its transaction commits, which is the point — and it also means a caller
  that never commits never sends.

## Alternatives considered

**Keep sending inline, but asynchronously (`@Async`).** Rejected: it fixes the latency and nothing
else. An in-memory queue dies with the process, so a restart still loses the mail, and a failure is
still only a log line.

**Store the mail's ingredients (recipients, body, attachments) instead of the MIME bytes.**
Rejected: it needs a second table for the attachments and a re-composition step that can drift from
the composing code, in exchange for a readability nobody needed — the subject and recipients that
actually get read are stored as columns anyway.

**`pg_notify` like the SSE outbox.** Rejected as the *only* trigger: it cannot deliver a retry or a
row that was written while nothing was listening, so the poll has to exist regardless — and once it
does, the notification saves at most a few seconds on something nobody is waiting for.

**A message broker.** Rejected: another system to run and watch for a handful of mails a day, in an
application that deliberately runs as one container with one database
([ADR-0001](0001-modular-monolith-with-spring-modulith.md)).

## References

- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/database/common/mailoutbox/`
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/common/mail/MailSenderService.kt`
- `backend/src/main/resources/db-migration/R__00095_mail_outbox.sql`
- `SseOutboxService` — the same pattern for the opposite direction
