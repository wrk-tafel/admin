# ADR-0047: Scheduled jobs coordinate on their own rows first, ShedLock second

**Status:** accepted · **Recorded:** 2026-08-11

## Context

Every `@Scheduled` job runs in every instance. That is correct for a single-instance deployment,
which is what this one has been, and [ADR-0003](0003-postgresql-as-the-only-infrastructure-dependency.md)
records it as an explicit assumption ("Scheduling: Spring's `@Scheduled` in the same process", and
"it *is* an assumption of single-instance deployment, as is every in-process `@Scheduled` job"). The
high-availability review ([#3188](https://github.com/wrk-tafel/admin/issues/3188)) made it a blocker:
on several instances the ten scheduled jobs do not all behave.

They fall into three groups, and the difference between them is what the job has to coordinate *on*:

- Five **retention cleanups** delete rows past a cutoff (`sse_outbox`, `mail_outbox`,
  `login_attempts`, `scanner_registrations`, `audit_log`). Filed in the issue as harmless
  duplicates, they were in fact the ones that would break: each used a Spring Data *derived* delete,
  which loads every matching entity and removes it one at a time. Two instances then load the same
  rows, and the loser's `delete ... where id = ?` affects nothing, which Hibernate reports as a
  `StaleStateException`.
- Three jobs have **no rows to claim**: a push notification that is due once a day
  (`DistributionStillOpenReminderService`), a reconciliation of the documents folder against the
  database (`DocumentStorageCleanupService`), and a poll of the scanner NAS share
  (`DocumentScannerWatcherService`). A second instance sends a second notification, races over which
  of them deletes an orphaned file, and lists the share a second time every second.
- Two are **already correct**. `MailOutboxService.sendPendingMails` takes one mail with
  `FOR UPDATE SKIP LOCKED` ([ADR-0045](0045-one-mail-per-transaction-taken-with-skip-locked.md)), and
  `ConfigFileReloadService` has to run everywhere, since each instance re-reads its own config file.

The issue proposed one guard for all of them, built on the existing `AdvisoryLockService`.

## Decision

**A scheduled job coordinates on the rows it is working on. Only a job that has no rows takes a
scheduler lock, and that lock is ShedLock's.**

The five cleanups became native, set-based deletes that claim their rows the same way the mail
outbox does:

```sql
DELETE FROM sse_outbox
WHERE id IN (SELECT id FROM sse_outbox WHERE event_time < :eventTime FOR UPDATE SKIP LOCKED)
```

Two instances then *share* the work rather than one standing idle, neither waits for the other, and
whatever one skips the next tick takes. It is also one round trip instead of one per row.

The three jobs with nothing to claim use `@SchedulerLock` (`shedlock-spring` +
`shedlock-provider-jdbc-template`, wired in `config/SchedulerLockConfig.kt`, table in
`R__00100_shedlock.sql`). Two of them are daily crons whose real risk is not overlapping but firing
seconds apart, so both set `lockAtLeastFor` — the lock is held for an hour however briefly the job
ran. The provider is configured `usingDbTime()`, so `lock_until` is written and compared by the
database's clock rather than by each node's.

`DocumentScannerWatcherService` takes its lock through `LockingTaskExecutor` by hand instead of the
annotation, because the annotation's advice runs before the method body and the first thing that
method does is decide whether the scanner-folder feature is switched on at all. Locking by
annotation would make a deployment without a scanner folder pay a database round trip every second
to guard a job that returns immediately.

`ConfigFileReloadService` is deliberately **not** locked, and its schedule changed from a fixed delay
to a cron (`tafeladmin.configReload.cron`) so that every instance reloads on the same wall-clock
boundary. A fixed delay is phased by whenever each instance booted and drifts further with every
tick, which would leave instances answering from different configuration for up to a full interval
after an operator's edit.

## Consequences

- **A new library and a new table.** ShedLock is a dependency to keep patched, and `shedlock` is a
  table in every environment. It is not a new *piece of infrastructure* — the JDBC provider stores
  the lock in the application's own PostgreSQL — so ADR-0003 stands as written.
- **Two mechanisms to choose between, and the choice is not a preference.** The test is whether the
  job has rows of its own: if it does, `SKIP LOCKED` is strictly better, because it keeps both
  instances working. A new scheduled job has to be classified, and nothing enforces the
  classification.
- **`lockAtLeastFor` may not exceed `lockAtMostFor`** — ShedLock throws at runtime, on every
  execution, if it does. `SchedulerLockIT` exists because that misconfiguration is invisible until
  the job actually fires, which for a daily cron means the next morning.
- **The scanner watcher writes to `shedlock` once a second** while the feature is enabled, deliberately
  traded against listing a network share once a second per instance. A follower's attempt matches no
  row and writes nothing.
- **A crashed holder blocks its job for `lockAtMostFor`.** For the daily jobs that is an hour, and
  the run is simply skipped until the next day. Acceptable for a reminder and a cleanup; it would
  not be for anything time-critical.
- **The native deletes are unchecked by the compiler.** A native query is parsed the first time it
  runs, so `ScheduledCleanupSkipLockedIT` runs all five against a real database. The services' unit
  tests mock the repositories and can see none of it.
- **Renaming `tafeladmin.configReload.interval` to `.cron` changes an operator-facing setting.** A
  deployment that set the old key falls back to the default until its `config.yml` is updated.
- This does **not** make the application ready for several instances. The in-process cache, the
  shared documents volume and the SSE connection budget are separate blockers under #3188.

## Alternatives considered

**`AdvisoryLockService` (`pg_try_advisory_xact_lock`) for all of it**, as the issue proposed. It is
already here, needs no dependency and no table, and `tryWithLock` already means "skip if someone else
has it". Rejected as leader election, on three counts:

- The locks are transaction-scoped, so holding one for a job's duration means holding a *transaction*
  — and a pooled connection — for that duration. `leak-detection-threshold` is 60s, so any job over a
  minute would log a warning with a stack trace on every run, blunting the one signal that catches
  real leaks. It would also pin the vacuum horizon while the job does no database work at all.
- The lock's lifetime is tied to a TCP connection. A dropped connection releases it mid-job while the
  job thread carries on, letting a second instance start the same work — triggered by a network event
  rather than by anything the application chose.
- It answers "is someone doing this right now?", not "has this already run in this period?". The
  daily jobs are far too short to overlap; their failure mode is two instances firing seconds apart,
  which mutual exclusion does not cover and `lockAtLeastFor` does.

Advisory locks remain the right tool for what they are used for elsewhere — serializing a short
critical section inside a transaction that was going to exist anyway.

**Leaving the cleanups alone as "idempotent".** Rejected once the derived deletes turned out to be
entity-by-entity: concurrent runs raise `StaleStateException`, and the delete costs a round trip per
row either way.

**A hand-rolled claim table** (`job_name`, `last_run_at`, conditional `UPDATE`). It is what ShedLock
is, minus the maintenance, the `usingDbTime` handling and the tested edge cases. Reasonable for one
job; not for three, and writing it twice would be the point at which to have used the library.

**Making the reminder idempotent instead of locked**, by stamping the send on the distribution row.
Robust to clock skew and to a crash mid-fan-out, and needs no library — but it solves exactly one of
the three jobs and needs a migration and a column of its own.

## References

- [#3192](https://github.com/wrk-tafel/admin/issues/3192), part of the HA review in
  [#3188](https://github.com/wrk-tafel/admin/issues/3188)
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/config/SchedulerLockConfig.kt`
- `backend/src/main/resources/db-migration/R__00100_shedlock.sql`
- `backend/src/test/kotlin/at/wrk/tafel/admin/backend/config/SchedulerLockIT.kt`,
  `.../database/common/ScheduledCleanupSkipLockedIT.kt`
- [ADR-0003](0003-postgresql-as-the-only-infrastructure-dependency.md),
  [ADR-0045](0045-one-mail-per-transaction-taken-with-skip-locked.md),
  [ADR-0011](0011-configuration-hot-reload-instead-of-restarts.md)
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/database/common/lock/README.md`
