# ADR-0032: Check-in relays scan results without interpreting them

**Status:** accepted · **Recorded:** 2026-08-09

## Context

Customers check in by having the QR code on their ID card scanned. The obvious backend design is a
module that receives a scan, resolves the household behind the code, and assigns it a ticket in the
current distribution — one endpoint, one transaction.

That design would make the scanning module depend on both `household` and `distribution`, i.e. on
most of the system. Meanwhile the scanning hardware is varied and improvised: handheld scanners and
browser-based scanning on a phone or tablet, several of them at once during a distribution, each
needing its results to arrive at the right screen and nowhere else.

## Decision

**`checkin` registers scanner devices and relays raw scan results. It interprets nothing, and it
depends on no other feature module.**

- `@ApplicationModule(allowedDependencies = {})` — the module imports no other feature module at all.
  Its only outside dependencies are shared infrastructure outside the `modules` tree: the SSE
  utilities, the outbox service and its own entities.
- A **scanner is just an integer id** that a client claims once (`POST /api/scanners/register`) and
  then uses to tag its scans and to open its own stream.
- `ScanResult.value` is an opaque `Long`. The module has no notion of a customer, a household or a
  distribution.
- Results are posted to `/api/scanners/{scannerId}/results` and relayed over
  `/api/sse/scanners/{scannerId}/results`, filtered by scanner id, so one device's scans reach only
  that device's screen.
- That stream opts **out** of outbox replay (`replayable = false`): its events *do* something rather
  than describe current state, so re-delivering one after a reconnect would re-trigger an action
  ([ADR-0005](0005-server-sent-events-with-a-transactional-outbox.md)).
- The **frontend** decodes the value and calls the `household` and `distribution` endpoints itself.
- Registration takes the `SCANNER_REGISTRATION` advisory lock, because assigning the next id is a
  gap-filling query (it reuses the lowest free id rather than incrementing), and two concurrent
  registrations would otherwise compute the same one and collide on the unique constraint.

## Consequences

- The module stays tiny and independently understandable, and its zero-dependency declaration is a
  boundary that cannot erode by accident.
- What a scanned code *means* can change without touching the backend, because the backend never knew.
- Multiple scanners work concurrently with no coordination beyond their ids.
- **Turning a scan into "customer X gets ticket Y" is frontend orchestration**, which means it is
  several HTTP calls rather than one transaction, and a failure part-way through is the client's to
  handle. That is the real cost of the boundary.
- A future feature that needs the *backend* to react to a scan (server-side auto ticket assignment,
  say) cannot be added inside `ScannerService` without either loosening `allowedDependencies` or
  routing it through an event — a deliberate speed bump, and worth knowing before promising such a
  feature.
- Gap-filling ids keep the numbers small and human-usable ("scanner 3") instead of growing forever,
  at the cost of needing a lock and of an id being reusable after a device is gone.
- Lock ids share **one PostgreSQL keyspace regardless of session or transaction scope**. This module
  is where that bit: a raw `pg_advisory_lock(1000)` collided with `CREATE_DISTRIBUTION`'s key. Every
  lock now goes through `AdvisoryLockKey` for exactly that reason
  ([ADR-0003](0003-postgresql-as-the-only-infrastructure-dependency.md)).

## Alternatives considered

**Resolve the scan server-side and assign the ticket in one call.** The simpler client, and rejected:
it would make the scanning module depend on `household` and `distribution`, turning the most
peripheral part of the system into one of the most coupled.

**Give scanners UUIDs instead of small integers.** Rejected: staff refer to physical devices out
loud, and "scanner 3" works where a UUID does not. The gap-filling query is the price.

**WebSocket or polling per scanner.** Rejected — same reasoning as
[ADR-0005](0005-server-sent-events-with-a-transactional-outbox.md); the stream is one-directional.

**Let the scanner stream replay like the others.** Rejected outright: replay is safe only for
snapshot events, and a re-delivered scan would be a phantom check-in.

## References

- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/modules/checkin/README.md`
- `modules/checkin/package-info.java`, `internal/ScannerService.kt`
- `database/common/lock/AdvisoryLockKey.SCANNER_REGISTRATION`
</content>
