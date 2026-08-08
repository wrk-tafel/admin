# ADR-0016: The distribution lifecycle — implicit state, non-blocking locks, two-stage close

**Status:** accepted · **Recorded:** 2026-08-09

## Context

A distribution ("Ausgabe") is the central event the whole application revolves around: while one is
open, customers check in, tickets are called, food collections are recorded and statistics are
entered. Many features are only meaningful during one, which the backend enforces with the
`@TafelActiveDistributionRequired` marker annotation checked by a global `HandlerInterceptor`.

Three questions had to be answered, and their answers are entangled:

1. How is "the current distribution" represented?
2. What happens when two people press *Ausgabe starten* — or *schließen* — at the same time? This is
   not hypothetical: several volunteers work the same screens on the same afternoon, on shared
   devices, with a double-click being the normal way to be sure a button registered.
3. Closing a distribution triggers a chain of work — statistics snapshot, pending cost contributions,
   a daily report PDF and CSV exports emailed out. Which of it may fail without corrupting the rest?

## Decision

**"Current" is a data shape, concurrency is handled with non-blocking advisory locks, and closing is
split into an atomic in-module stage followed by a separate cross-module stage.**

- There is **no `active` column**. The distribution with the highest id is the current one, and it is
  active only while `ended_at is null`:
  `findFirstByOrderByIdDesc()` filtered on `endedAt == null`. Only one can be open at a time, and
  `createNewDistribution()` refuses while an unfinished one exists.
- Start and close both take a **transaction-level advisory lock with the non-blocking variant**
  (`pg_try_advisory_xact_lock`, `CREATE_DISTRIBUTION` / `CLOSE_DISTRIBUTION`). If the lock is held,
  the request fails immediately with a user-facing message telling the user to reload — it never
  waits.
- `closeDistribution()` commits `ended_at` in its own `REQUIRES_NEW` transaction *before* publishing
  the event, so the async post-processing thread's own transaction can see it.
- Post-close work is two stages with different guarantees:
  - `DistributionEndedEvent` (internal to the module) → `DistributionEndedEventListener` runs the
    statistics snapshot and the missing-cost-contribution update **with no try/catch**, so either
    both land or the transaction rolls back — no half-closed state.
  - Only after that commits does it publish `DistributionClosedEvent`, which `reporting` picks up to
    generate and email the daily report, statistic CSVs and return-boxes summary. Each of the three
    mails is isolated and retried up to three times.
- The manual re-send endpoint publishes `DistributionClosedEvent` **directly**, never
  `DistributionEndedEvent` — re-running the cost-contribution stage would double-count.
- Slow listeners run off the publishing thread (`push`'s fan-out is `@Async`), and
  `DistributionStartedEvent` is published *outside* the locked block, so nothing a listener does is
  counted against the lock.

## Consequences

- No status column can disagree with the data. There is no "closed but still marked active" state to
  repair, and the ordering of distributions is the ordering of their ids.
- Only one distribution can ever be open. That is a genuine constraint on the domain, and it matches
  how the organisation actually works — but it is baked in deep, not configurable.
- Double-clicking start or close produces a clear error instead of a hung request or a duplicate
  distribution. Failing fast was chosen over queueing precisely because a waiting request looks like
  a frozen screen to someone standing at a desk.
- **The lock is held for the enclosing transaction's whole runtime**, so anything slow inside it
  blocks the next attempt and can make a legitimate start look like a concurrent one. Keeping event
  publication and listener work outside the locked block is what prevents that.
- The two-stage close means a mail failure never rolls back the statistics, and a statistics failure
  never sends a report describing a state that was not saved. The price is that "the distribution is
  closed" and "the reports went out" are two separate facts, and only the first is transactional.
- Several `DistributionService` methods force-unwrap `getCurrentDistribution()!!`. That is safe only
  because every controller entry point carries `@TafelActiveDistributionRequired`, and the
  interceptor only runs for requests dispatched through Spring MVC. **A new caller from a scheduled
  job, another service or a direct test call gets an NPE**, not the friendly business error.

## Alternatives considered

**An explicit `status`/`active` column.** The conventional model, and rejected because it introduces
a second source of truth that can drift from `ended_at`, plus the invariant "at most one row is
active" to enforce separately.

**Blocking locks (`pg_advisory_xact_lock`).** Rejected on UX: the second clicker would wait for the
first operation to finish and then get a confusing result, instead of an immediate "someone else is
starting this, reload".

**Optimistic locking / a unique constraint instead of an advisory lock.** Rejected: the invariant is
"no open distribution exists", which is a condition over a query result rather than over one row —
not expressible as a unique constraint.

**One transaction for close plus all post-processing.** Rejected: it would let a mail-server outage
roll back the close itself, and it would hold a database transaction open for the duration of PDF
rendering and SMTP delivery.

**`@ApplicationModuleListener` for the reporting handoff.** Rejected: it runs async after commit,
which would make the manual mail re-send report success before knowing whether the send worked.

## References

- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/modules/distribution/README.md`
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/database/common/lock/README.md`
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/modules/reporting/README.md`
- `common/api/TafelActiveDistributionRequiredInterceptor.kt`
</content>
