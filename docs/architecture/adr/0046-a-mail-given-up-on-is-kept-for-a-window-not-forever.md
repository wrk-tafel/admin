# ADR-0046: A mail given up on is kept for a window, not forever

**Status:** accepted · **Recorded:** 2026-08-11

## Context

[ADR-0041](0041-mails-sent-through-an-outbox.md) keeps a mail that could not be delivered: after the
last retry the row is parked as `FAILED` with its error, rather than dropped, because a mail nobody
received is exactly the thing somebody has to be able to find afterwards. The cleanup job that
empties the queue took `SENT` rows only, so a parked row stayed until somebody deleted it in the
database by hand — and no screen ever shows it, so in practice nobody did.

That row is not a log line. It holds the finished MIME message: the daily report PDF, the statistics
CSVs — one of which lists children by name, age and household ([`StatisticsService`](
../../../backend/src/main/kotlin/at/wrk/tafel/admin/backend/modules/reporting/internal/StatisticsService.kt))
— or a support request's screenshot of whatever screen it was written on. So the queue accumulated
personal data with no retention rule at all, and an erasure request against a household never reached
it. The GDPR review recorded exactly that as gap G10
([#3183](https://github.com/wrk-tafel/admin/issues/3183)), which asks for one of two answers: a
retention window of its own, or a screen where an administrator dispositions the row.

## Decision

**A `FAILED` row is deleted once `tafeladmin.mailOutbox.failedRetention` (30 days) has passed, by the
same hourly job that clears sent ones** (`MailOutboxService.cleanupOldMails`).

- Longer than the 14 days a `SENT` row gets, because it is the only record that somebody never got
  their mail and that question arrives late — after the report was missed, not while it was being
  sent.
- Counted from `createdAt`, not from the moment of giving up: a mail nobody received has no `sentAt`,
  and nothing records when the last attempt ran out. With five attempts and a capped backoff the
  give-up follows queuing within a couple of hours, which is nothing against 30 days.
- The retention window is the answer to G10's question rather than a disposition screen: there is
  nothing for an administrator to *do* with the row — the failure was already announced as a push
  notification when it happened (`MailDeliveryFailedEvent`), and the row's job until it expires is to
  be findable during a support call.

## Consequences

- The erasure timeline can now be stated for the whole mail queue: 14 days after sending, 30 days
  after queuing for a mail that failed. No copy in `mail_outbox` outlives that.
- **A mail that failed more than 30 days ago is gone, error and all.** If somebody asks in February
  why the December report never arrived, the row is no longer there to answer with. The push
  notification and the `ERROR` log line from the give-up remain, and neither carries the message.
- The window is configuration, so an operator who needs longer can have it — at the price of keeping
  the personal data that long, which is the trade-off this record exists to make visible.
- Nothing else changes about the failure path: the give-up still parks the row, still keeps
  `lastError`, and still announces itself.

## Alternatives considered

**Leave `FAILED` rows forever, as ADR-0041 had it.** Rejected: it is the one store in this
application with personal data and no clock on it, it grows without bound in the exact case where
something is already going wrong (a mail server outage parks every mail of that day), and an erasure
request cannot reach it.

**A screen where an administrator reviews and deletes parked mails** — G10's other option. Rejected
for now: it is a whole feature (list, read, delete, permission) for a queue that holds a handful of
rows a year, and it would still leave the rows nobody dispositions sitting there forever. A retention
window needs no attention to work, and the screen stays possible on top of it if the rows ever turn
out to be worth reading.

**Delete the message bytes but keep the row as a tombstone.** Rejected: it doubles the states the
queue can be in for a benefit — "a mail failed on this date" — that the give-up's log line and push
notification already provide.

## References

- [#3183](https://github.com/wrk-tafel/admin/issues/3183) — GDPR gap G10, and the question this
  record answers; [`gdpr-compliance.md`](../gdpr-compliance.md)
- [ADR-0041](0041-mails-sent-through-an-outbox.md) — the outbox and the give-up rule this narrows
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/database/common/mailoutbox/MailOutboxService.kt`
