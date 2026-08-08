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
  Registered as `replayable = false`: this is the only stream excluded from the replay
  `SseOutboxListenerService` does after it reconnects, because the check-in screen *acts* on a scan
  result (loads that customer and resets the form) instead of just displaying it — so a duplicate
  would discard a ticket number being typed, and a late one would jump to a customer scanned
  minutes ago. A scan that is dropped instead simply gets scanned again.

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

### `registerScanner()` goes through the shared `AdvisoryLockService`
```kotlin
fun registerScanner(existingScannerId: Int? = null): Int = advisoryLockService.withLock(AdvisoryLockKey.SCANNER_REGISTRATION) {
    // ...
}
```
This used to be a raw `pg_advisory_lock(1000)`/`pg_advisory_unlock(1000)` pair called directly from
`ScannerRegistrationRepository`, bypassing `database.common.lock.AdvisoryLockService`/`AdvisoryLockKey`
entirely (see that module's own README). Because PostgreSQL advisory locks share **one keyspace
regardless of session vs. transaction scope**, that raw numeric id `1000` collided with
`AdvisoryLockKey.CREATE_DISTRIBUTION`, which also uses `1000` (via `pg_try_advisory_xact_lock`). It's
now registered as its own key, `AdvisoryLockKey.SCANNER_REGISTRATION` (`5000L`), and acquired via
`AdvisoryLockService.withLock` like everywhere else. If you add a new lock anywhere, always register it
in the shared `AdvisoryLockKey` enum instead of a raw numeric id, precisely to avoid this class of bug.

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
