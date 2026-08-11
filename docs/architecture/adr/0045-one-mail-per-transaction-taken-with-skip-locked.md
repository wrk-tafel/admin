# ADR-0045: One mail per transaction, taken with `FOR UPDATE SKIP LOCKED`

**Status:** accepted · **Recorded:** 2026-08-11

## Context

[ADR-0041](0041-mails-sent-through-an-outbox.md) put every outgoing mail in a `mail_outbox` row and
gave a scheduled poller the job of delivering it. That poller simply selected the due `PENDING` rows
and handed them to the mail server — correct for exactly one application instance, and recorded as
such in that ADR's consequences: *"Two application instances would send every queued mail twice."*

The high-availability review ([#3188](https://github.com/wrk-tafel/admin/issues/3188)) made that the
first blocker to running a second instance: each instance's poller reads the same batch, so N
instances mean N copies of every daily report, statistics mail, return-box mail and support request
— the most visible way this application could misbehave under HA, since the duplicates leave the
building and land in people's inboxes.

Nothing else in the queue needed changing. The retry backoff, the give-up rule and the `FAILED`
parking already work per row and per instance; what was missing was an answer to "who is sending
this one".

## Decision

**A poll takes one due mail at a time with `SELECT … FOR UPDATE SKIP LOCKED`, and sends it inside the
transaction that holds that lock** (`MailOutboxService.sendPendingMails`, via a `TransactionTemplate`
so the boundary is visible where the loop is).

- The row lock is the whole mechanism: a second instance's poller skips a row that is being sent and
  takes the next one, so the two share the queue instead of duplicating it. It is released by the
  commit, at which point the row is `SENT` (or rescheduled) and no longer due — so nothing has to
  hold it afterwards.
- **The transaction spans the SMTP call**, which is why its scope is one mail rather than a batch. A
  poller killed mid-send rolls exactly that mail back to `PENDING`, where the next poll picks it up
  seconds later; the mails already sent keep their recorded outcome because each was committed on its
  own.
- The poll keeps taking the next due mail until there is none, so there is no batch size to tune. The
  cutoff (`next_attempt_at <= now`) is read once per poll, so a mail that becomes due while the poll
  runs belongs to the next tick rather than extending this one.
- No new column and no new status: a mail is `PENDING` until it is `SENT` or `FAILED`, and "being
  sent right now" is a row lock rather than state.

## Consequences

- More than one instance can poll `mail_outbox` without anybody getting the same mail twice, which
  removes the first of the four blockers in #3188.
- **Delivery is at-least-once.** A poller killed after the mail server accepted the message but
  before the commit leaves the row `PENDING`, and the mail goes out again. The window is one commit
  wide; a duplicate report is also the better of the two failures, the alternative being a report
  nobody gets.
- **A write transaction is open for as long as one SMTP send takes**, holding one pooled connection
  and pinning the xmin horizon for that time. Normally under a second. It is bounded by whatever
  timeouts the mail server connection has — and `spring.mail.properties.mail.smtp.*timeout` is
  currently unset, so a hung mail server holds that transaction open exactly as long as it hangs the
  poller. Worth fixing regardless of this record; it is the difference between "the poll is stuck"
  and "the poll is stuck *and* a transaction is open".
- Recovery needs nothing: no status to reset, no expiry to tune, no job to run. A crash leaves the
  queue in the state it was in before the mail was taken.
- One transaction per mail rather than per poll — a handful of extra transactions a day at this
  volume.
- The `MailDeliveryFailedEvent` for a give-up is now published inside the sending transaction. Its
  listener is `@Async`, so the notification can in principle go out just before a commit that then
  fails. It says a mail was not delivered, which is true either way.

## Alternatives considered

**Claim a batch first — mark it `SENDING` in a committed transaction, then send outside any
transaction.** The version this record originally described. It keeps SMTP out of every transaction,
but it needs a new status, a claim timeout, a job that releases the claims of instances that died,
and a rule about a claim expiring while its mail is still in flight. It also compares a deadline
written by one instance's clock against another instance's clock, so a skew between them re-sends
live mails. All of that machinery buys one thing — no transaction across SMTP — and it makes recovery
*slower*, since a stranded row waits for its claim to expire instead of being rolled back instantly.

**One transaction for the whole batch, with the lock held across all of its sends.** Simpler still,
and the recovery is the same rollback. Rejected because the rollback then covers every mail in the
batch: a poller killed after mail 7 of 20 loses the `SENT` records of seven mails that were already
delivered, and the next poll sends all seven again. Per-mail scope bounds a crash to one duplicate.

**An advisory lock around the whole poll (`pg_try_advisory_xact_lock`), the mechanism this codebase
already uses for mutual exclusion.** Rejected: it serializes the pollers instead of letting them
share the work — with two instances, one does nothing while the other drains the queue — and it holds
one transaction across the whole poll, which is the batch-scope problem above.

**ShedLock, or leader election, so only one instance polls at all.** Rejected here: it solves the
wider "every `@Scheduled` job runs on every instance" problem (#3188's B4) rather than this one, adds
a dependency [ADR-0003](0003-postgresql-as-the-only-infrastructure-dependency.md) would want weighed
first, and would leave the queue single-threaded even when both instances are healthy.

## References

- [#3189](https://github.com/wrk-tafel/admin/issues/3189) — the issue this record comes from,
  [#3188](https://github.com/wrk-tafel/admin/issues/3188) the HA review that found it
- [ADR-0041](0041-mails-sent-through-an-outbox.md) — the outbox this builds on
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/database/common/mailoutbox/MailOutboxService.kt`
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/database/common/mailoutbox/MailOutboxRepository.kt`
- `backend/src/test/kotlin/at/wrk/tafel/admin/backend/database/common/mailoutbox/MailOutboxConcurrentSendIT.kt` —
  two pollers against a real database
