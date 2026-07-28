# Checkin Module

This is the smallest feature module in the backend — two Kotlin files plus one entity/repository pair.
It handles **scanner device registration** and **relaying raw scan results in real time**. It does *not*
know what a scan means (customer lookup, ticket assignment, etc.) — that's entirely up to the frontend.

## Components

### ScannerController (`ScannerController.kt`)
`@RestController` under `/api`, class-level `@PreAuthorize("hasAnyAuthority('SCANNER', 'CHECKIN')")`
(applies to every endpoint below, none override it):
- `GET /api/scanners` — list all currently-registered scanner ids.
- `POST /api/scanners/register?scannerId=<optional>` — register a new scanner, or refresh/re-claim an
  existing one; returns the assigned `scannerId`.
- `POST /api/scanners/{scannerId}/results?scanResult=<long>` — accept a raw scan result value (e.g. a
  decoded QR code payload) for a given scanner and publish it via the SSE outbox.
- `GET /api/sse/scanners/{scannerId}/results` — SSE stream of `ScanResult` events for one specific
  scanner (filtered by `scannerId` client-side of the outbox forwarding, via `acceptFilter`).

### ScannerService (`internal/ScannerService.kt`)
- `registerScanner(existingScannerId: Int? = null)` — see gotchas below for its exact (non-obvious)
  behavior.
- `getScannerIds()` — all registered scanner ids, sorted.
- `cleanupScannerRegistrations()` — `@Scheduled(fixedDelay = 1, TimeUnit.HOURS)`, deletes registrations
  whose `registrationTime` is older than `SCANNER_REGISTRATIONS_KEEP_DAYS` (2 days). This is what frees up
  a scanner id for reuse — see below.

### ScannerRegistrationEntity / ScannerRegistrationRepository (`database/model/checkin/`)
Table `scanner_registrations` (`id`, `registration_time`, `scanner_id`). Per
`R__00058_add_scanner_registration.sql`, `scanner_id` has a **DB-level `UNIQUE NOT NULL`** constraint —
this is why the registration flow needs an advisory lock (see below).

## What a "scanner" actually is here

A scanner is just an integer id (`scannerId`) that a physical/browser-based scanning client registers
for itself once, then uses to tag every subsequent scan result and to open its own SSE stream. There is
no concept of "which customer" or "which distribution" anywhere in this module — `ScanResult.value` is
an opaque `Long` the caller decides the meaning of. This is a direct consequence of the module boundary
below.

## `allowedDependencies = {}`

```java
@org.springframework.modulith.ApplicationModule(
        allowedDependencies = {}
)
package at.wrk.tafel.admin.backend.modules.checkin;
```

`checkin` is not allowed to import any other feature module (`distribution`, `household`, `logistics`,
etc.) — confirmed: neither `ScannerController` nor `ScannerService` reference anything under
`modules.*` besides their own `internal` package. Its only outside dependencies are shared
infrastructure that sits *outside* the `modules` tree and isn't subject to the Modulith check:
`common.sse.SseUtil`, `database.common.sseoutbox.SseOutboxService`, and its own
`database.model.checkin.*` entity/repository.

**Architectural implication:** `checkin` cannot call into `distribution` to assign a ticket, nor into
`household` to look up a customer from a scanned code. Turning a physical scan into "customer X gets
ticket Y" is entirely a frontend responsibility — the frontend listens on
`/api/sse/scanners/{scannerId}/results`, decodes/interprets `ScanResult.value` itself, and then calls the
appropriate `household`/`distribution` endpoints separately. If a future feature needs the backend
itself to react to a scan (e.g. server-side auto ticket assignment), it cannot be added directly inside
`ScannerService` without either loosening `allowedDependencies`, or wiring it through the SSE outbox /
an event, keeping `checkin` itself dependency-free.

## Gotchas

### `registerScanner()` uses its own raw advisory lock, not the shared one
```kotlin
@Query(value = "SELECT pg_advisory_lock(1000)", nativeQuery = true)
fun acquireLock()

@Query(value = "SELECT pg_advisory_unlock(1000)", nativeQuery = true)
fun releaseLock()
```
This is a **session-level** lock (`pg_advisory_lock`/`pg_advisory_unlock`, manually released), called
directly from `ScannerRegistrationRepository` — it does **not** go through
`database.common.lock.AdvisoryLockService` / `AdvisoryLockKey` (see that module's own README). Two
consequences worth knowing:
- It bypasses the project's usual lock bookkeeping (`AdvisoryLockKey` enum), so there's nowhere else in
  the codebase that documents "lock id `1000` is taken by scanner registration."
- PostgreSQL advisory locks share **one keyspace regardless of session vs. transaction scope** — only
  the release semantics differ. `AdvisoryLockKey.CREATE_DISTRIBUTION` (in the `distribution` module's
  lock enum) also uses the numeric id `1000`, just via `pg_try_advisory_xact_lock`. Because both go
  through the single-`bigint`-argument overload of the advisory lock functions, they occupy the *same*
  lock id in Postgres. In practice the window is tiny (the session lock here is held only for the
  duration of `registerScanner()`, a few statements), but it's a real, easy-to-miss cross-module
  collision on a raw numeric id. If you add a new lock anywhere, prefer registering it in the shared
  `AdvisoryLockKey` enum instead of a magic number, precisely to avoid this.

### `getNextScannerId()` fills gaps, it doesn't just increment
```sql
SELECT COALESCE(
  (SELECT t.scanner_id + 1 FROM (
     SELECT scanner_id, LEAD(scanner_id) OVER (ORDER BY scanner_id) AS next_scanner_id
     FROM scanner_registrations
   ) t
   WHERE next_scanner_id IS NULL OR next_scanner_id > t.scanner_id + 1
   ORDER BY t.scanner_id LIMIT 1),
  (SELECT COALESCE(MAX(scanner_id), 0) + 1 FROM scanner_registrations)
) AS next_available_scanner_id;
```
Scanner ids are **reused**, not monotonically increasing: this finds the smallest gap in the existing
`scanner_id` sequence, and only falls back to `MAX + 1` if there is no gap. Combined with the hourly
`cleanupScannerRegistrations()` job (registrations older than 2 days are deleted), a scanner id that
stopped being used two days ago will be handed out again to the next new registration. Don't assume
scanner ids are stable/unique over the long term, or that a higher id was registered more recently.

### `registerScanner(existingScannerId)` branch behavior is subtle
```kotlin
val nextScannerId = scannerRegisteredRepository.getNextScannerId()
var scannerRegistration =
    if (existingScannerId != null) {
        scannerRegisteredRepository.findByScannerId(existingScannerId)
    } else {
        scannerRegisteredRepository.findByScannerId(nextScannerId)
    }
```
- If the caller passes `existingScannerId` and that registration is still present (not yet cleaned up),
  its `registrationTime` is refreshed (effectively a heartbeat/keep-alive) and the same id is returned.
- If the caller passes `existingScannerId` but it has since been cleaned up (expired), a **brand new**
  registration is created using `nextScannerId` instead — the caller silently gets a *different* scanner
  id back, not an error. Frontend code re-registering an expired scanner must not assume it gets the same
  id it asked for; it must always use the id in the response.
- If `existingScannerId` is `null`, the `findByScannerId(nextScannerId)` lookup is effectively always a
  miss (by construction, `getNextScannerId()` only ever returns an id currently *not* in use), so this
  branch always inserts a new row. The lookup there is vestigial/defensive rather than load-bearing.

### The advisory lock protects a real DB constraint
The lock exists because `scanner_id` is `UNIQUE NOT NULL` at the DB level (see
`R__00058_add_scanner_registration.sql`) and the "find next free gap" query above is a
check-then-act: without serializing registrations, two concurrent `POST /api/scanners/register` calls
could compute the same gap and both try to insert it, and the second one would fail the unique
constraint instead of getting a different id.
