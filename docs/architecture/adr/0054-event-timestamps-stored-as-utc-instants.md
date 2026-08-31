# ADR-0054: Event timestamps are stored as UTC instants, still rendered in Europe/Vienna

**Status:** accepted · **Recorded:** 2026-08-30

## Context

[ADR-0027](0027-single-locale-and-timezone.md) fixed the whole runtime to `Europe/Vienna` and, in its
alternatives, explicitly rejected "store and compute in UTC, convert at the edges" as unneeded
overhead for a single-site deployment. That reasoning covers *computation and display* correctly —
this ADR does not reopen it — but it left one thing unexamined: every event timestamp
(`households.created_at`, `distributions.started_at`, `users.token_invalidated_at`,
`audit_log.occurred_at`, and around thirty more columns) is a Postgres `timestamp` *without* a time
zone, populated from `LocalDateTime.now()`.

A `timestamp without time zone` value carries no record of which offset it was written under — it is
just eight bytes that read like a date and a clock face, nothing else. Today every writer and every
reader happens to agree that those bytes mean "Europe/Vienna wall-clock time", because the JVM's
default zone is pinned to `Europe/Vienna` everywhere the application runs
([ADR-0027](0027-single-locale-and-timezone.md)). That agreement is implicit and easy to violate by
accident — a `psql` session, a backup restored with a different session `TimeZone`, a future report
computed in the database itself with `now()` rather than the JVM's clock — and it is actively wrong
for one hour a year: the DST "fall back" from CEST to CET repeats the wall-clock hour 02:00–03:00
once with each offset, and a naive `timestamp` cannot tell those two hours apart. Two rows written
during that hour, one before and one after the clocks turn back, can compare as *out of order* even
though the second unambiguously happened after the first — `token_invalidated_at`/token-issued-at
comparisons and `audit_log.occurred_at` ordering are both exposed to this. Commit `efc860959` already
fixed one instance of it (comparing token invalidation as instants rather than as zoned
`LocalDateTime`s); this ADR closes the same gap at its source instead of at each comparison site.

## Decision

**Every column that records the instant a real event happened is a Postgres `timestamptz`, not a
`timestamp`.** A `timestamptz` value is self-describing: Postgres stores it as a true UTC instant
internally regardless of any session's `TimeZone` setting, so two rows can always be ordered
correctly and no reader has to know or guess which zone the writer meant.

- `R__00116_convert_event_timestamps_to_timestamptz.sql` converts every `timestamp` column in the
  schema to `timestamptz` in one repeatable migration, reinterpreting each existing value as
  `Europe/Vienna` wall-clock time (`... AT TIME ZONE 'Europe/Vienna'`) — what the application always
  meant when it wrote that value — and storing the equivalent UTC instant. It is written as a loop
  over `information_schema.columns` rather than one `ALTER TABLE` per column, so a future `timestamp`
  column added without a zone is caught (and converted) automatically the next time this migration
  runs, instead of quietly reintroducing the same gap.
- Two exclusions, both explained in the migration's own header comment:
  `flyway_schema_history.installed_on` stays `timestamp` — it is Flyway's own bookkeeping table, not
  ours to alter, and Flyway holds a lock on it for the whole duration of a migration run, so touching
  it from inside a migration that same run is executing would deadlock the migration against itself
  (this is not a hypothetical: an earlier version of this migration did exactly that during
  development, hanging until manually killed).
  `shedlock.lock_until`/`shedlock.locked_at` stay `timestamp` — ShedLock's lock provider is configured
  `usingDbTime()` specifically so a lock is written and compared entirely by the database's own clock
  and no application instance's clock can extend or steal it (see `SchedulerLockConfig`, ADR-0047);
  giving that table a zone changes nothing about its correctness.
- **Nothing else changes.** Kotlin entities keep their `LocalDateTime` fields
  (`BaseChangeTrackingEntity.createdAt`/`updatedAt` and the rest), the JVM's default zone stays
  `Europe/Vienna` ([ADR-0027](0027-single-locale-and-timezone.md), unchanged), and no DTO, PDF
  template, mail template, CSV export or frontend `DatePipe` call is touched. This works because
  pgjdbc converts a `timestamptz` column to/from `java.time.LocalDateTime` using the JVM's default
  zone at the JDBC boundary: on write, a `LocalDateTime` from `LocalDateTime.now()` is interpreted as
  `Europe/Vienna` and stored as the correct UTC instant; on read, that same UTC instant is converted
  back to the identical `Europe/Vienna` wall-clock `LocalDateTime` the code already expects. The
  round trip is exercised by `TimestampTimezoneConversionIT`.
- `spring.datasource.hikari.connection-init-sql: SET TIME ZONE 'Europe/Vienna'`
  (`application.yml`) pins every pooled connection's session `TimeZone` GUC to `Europe/Vienna` too, so
  the case of a raw/native SQL date function (`date_trunc`, `EXTRACT`, `to_char`, `now()`) applied
  directly to one of these columns keeps evaluating in Vienna terms rather than whichever zone the
  Postgres server itself defaults to.
- One real case of that turned up while writing the migration: `R__00066` had indexed
  `date(distributions.started_at)` so `StatisticsService.kt`'s `DATE(d.started_at) BETWEEN ...`
  filters could use an index instead of a sequential scan. `date()` on a naive `timestamp` is
  IMMUTABLE — there is no zone to resolve — but on a `timestamptz` it depends on the session's
  `TimeZone`, which Postgres can only ever call STABLE, and a STABLE expression cannot back an index
  (an index has to mean the same thing to every session that reads it, not just the one that built
  it). `R__00116` adds `vienna_date(ts timestamptz)`, a one-line SQL function marked `IMMUTABLE` that
  hard-codes `Europe/Vienna` rather than reading the session's `TimeZone` — genuinely deterministic
  for a fixed IANA tzdata, which is what makes the immutability claim honest rather than a lie the
  planner is trusting blindly. `StatisticsService.kt`'s seven `DATE(d.started_at)` filters now call
  `vienna_date(d.started_at)` instead, both to keep meaning "the calendar date in Vienna" rather than
  "in whatever zone a future session happens to have" and so the expression matches the index the
  planner is meant to use.

## Consequences

- The bytes in every event-timestamp column are now an unambiguous, correctly-orderable instant —
  the DST-hour ordering gap above cannot recur for any column this migration reaches, including new
  ones added later.
- The application's own behaviour is unchanged: `LocalDateTime.now()` still returns Vienna wall-clock
  time, the JVM zone is still fixed, and every existing display path (PDFs, mails, CSV, the frontend)
  keeps rendering exactly the values it always did, with zero code changes on the read side.
- The conversion is a one-time cost paid once, in this migration, at deploy time — existing rows are
  rewritten in place (`ALTER TABLE ... ALTER COLUMN ... TYPE timestamptz USING ...`), which takes an
  `ACCESS EXCLUSIVE` lock per table for the duration of the rewrite. Every table here is small enough
  (this is a single food bank's data, not a multi-tenant dataset) that this is a sub-second operation
  per table in practice.
- A future column meant to record a real event must be declared `timestamptz` from the start (or the
  next run of `R__00116` silently fixes it) — a plain `timestamp` on a new event column is now the
  bug this ADR exists to prevent, not the default to reach for.
- `shedlock` staying on `timestamp` is a deliberate, narrow exception, not an oversight — a future
  reader auditing "why isn't shedlock `timestamptz`" should read `SchedulerLockConfig`'s
  `usingDbTime()` comment, not assume it was missed by this migration.

## Alternatives considered

**Switch entity types to `Instant`/`OffsetDateTime` and change the wire format.** The more
"textbook-correct" typing, and what a green-field system would choose. Rejected here because it
would have meant touching every entity, every DTO built from one, every PDF/XSL-FO template, every
Thymeleaf mail template, every CSV exporter and every frontend `DatePipe` call to add an explicit
`Europe/Vienna` conversion at each — dozens of call sites, each a chance to get the zone wrong, to
fix a byte-level storage gap that `timestamptz` + the existing JVM-zone pin already closes without
touching any of them.

**Change the JVM's default zone to UTC instead.** Rejected: `-Duser.timezone` is read by far more
than JDBC — logging, the Saturday deploy-freeze reasoning ([ADR-0013](0013-saturday-production-deploy-freeze.md)),
and every place display code today implicitly relies on the default zone with no explicit conversion
(the whole surface [ADR-0027](0027-single-locale-and-timezone.md) built on). Moving it to UTC would
have silently broken all of that display code the same way the `Instant`/`OffsetDateTime` alternative
above would have, for no gain over pinning the *Postgres session's* `TimeZone` instead.

**Leave `timestamp without time zone` as-is and rely on convention.** The status quo, and what this
ADR replaces: correct only as long as every writer and reader agrees on the implicit zone, which the
DST-hour ordering gap above shows is not guaranteed even within this single-JVM-zone system.

## References

- Issue [#3574](https://github.com/wrk-tafel/admin/issues/3574)
- [ADR-0027](0027-single-locale-and-timezone.md) — the JVM/locale pin this decision builds on, not
  reverses
- [ADR-0047](0047-scheduled-jobs-coordinated-by-rows-first-shedlock-second.md) — `usingDbTime()` and
  why `shedlock` is excluded here
- `backend/src/main/resources/db-migration/R__00116_convert_event_timestamps_to_timestamptz.sql`
- `backend/src/main/resources/application.yml` — the `connection-init-sql` addition
- `backend/src/main/kotlin/.../modules/reporting/internal/StatisticsService.kt` — the `vienna_date()`
  callers
- `backend/src/test/kotlin/.../TimestampTimezoneConversionIT.kt`
</content>
