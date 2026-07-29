# Distribution Module

This module manages **food distribution events** ("Ausgaben") — the day-to-day process of opening a
distribution, calling customers up by ticket number, recording statistics, and closing the event out
(which triggers PDF/CSV report generation and emails).

## Core Concept: "the current distribution"

There is no `active` boolean column. A distribution is "current"/"active" purely by data shape:

```kotlin
// database/model/distribution/DistributionRepository.kt
fun DistributionRepository.getCurrentDistribution(): DistributionEntity? {
    val latest = findFirstByOrderByIdDesc()
    return if (latest?.endedAt == null) latest else null
}
```

The row with the highest `id` is the current one; it's "active" only if its `ended_at` is still `null`.
This means **only one distribution can ever be open at a time**, and distributions are implicitly
ordered by id/creation, not by an explicit status column. `createNewDistribution()` refuses to create a
new one while an unfinished one exists (`"Ausgabe bereits gestartet!"`).

## Components

### Entities (`database/model/distribution/`)
- **DistributionEntity** (table `distributions`) — one row per distribution event: `startedAt`,
  `endedAt`, free-text `notes`, the user who started/ended it, its 1:1 `statistic`, and its
  `households`/`foodCollections` associations.
- **DistributionHouseholdEntity** (table `distributions_households`) — a household's ticket within a
  distribution: `ticketNumber`, `processed` (has this ticket already been called/served?),
  `costContributionPaid`.
- **DistributionStatisticEntity** / **DistributionStatisticShelterEntity** (tables
  `distributions_statistics`, and a shelter snapshot list) — the statistics snapshot for a
  *closed* distribution. `isEmpty()` is used to validate that a distribution isn't closed without
  statistics ever having been entered.

### DistributionService (`internal/DistributionService.kt`)
The core service. Notable methods: `createNewDistribution()`, `assignHouseholdToDistribution()`,
`getCurrentTicketNumber()` / `closeCurrentTicketAndGetNext()` / `reopenAndGetPreviousTicket()` /
`deleteCurrentTicket()` (the ticket queue workflow), `validateClose()` / `closeDistribution()`,
`generateHouseholdListPdf()`, `updateDistributionStatisticData()` / `updateDistributionNoteData()`,
and `sendMails()` (manual re-send, see below).

### Controllers
- **DistributionController** — `/api/distributions*`: list, create, close, notes, statistics,
  household-list PDF, manual mail re-send, and the `/api/sse/distributions` SSE stream that pushes
  `DistributionItemUpdate` whenever the current distribution starts/ends.
- **DistributionTicketController** (`internal/ticket/`) — `/api/distributions/tickets/households/{id}`:
  get/delete the ticket assigned to a household.
- **DistributionTicketScreenController** (`internal/ticket/`) — `/api/distributions/ticket-screen/*`
  (`show-text`, `show-current`, `show-previous`, `show-next`) plus
  `/api/sse/distributions/ticket-screen/current`: drives the fullscreen "now serving" ticket display.

### Post-processor chain (`internal/postprocessors/`)
- **DistributionPostProcessor** — a `fun interface` with a single `process(distribution, statistic)`
  method.
- **DistributionPostProcessorService** — runs `@Async` right after a distribution is closed. It
  (re)computes and saves the statistics snapshot, then invokes every `DistributionPostProcessor` bean
  Spring injects as `List<DistributionPostProcessor>`, catching and logging exceptions per-processor so
  one failure doesn't block the others. Finally it publishes a `DistributionClosedEvent` (same
  try/catch isolation) for other modules to react to — see "Why `distribution` no longer depends on
  `reporting`" below.
- **ReturnBoxesMailPostProcessor** — builds a per-route/per-shop "which empty boxes need to go back to
  which shop" summary and emails it. Doesn't touch `reporting`.
- **MissingCostContributionPostProcessor** — for every household whose `costContributionPaid == false`
  on this distribution, adds the current cost-contribution amount to `household.pendingCostContribution`
  so it can be collected next time. Doesn't touch `reporting` either.

There are no `@Order` annotations on the post-processors — they run in whatever order Spring happens to
inject the `List<DistributionPostProcessor>` bean. If processing order ever matters, that needs to be
added explicitly.

### DistributionStatisticService (`internal/statistic/`)
Builds the `DistributionStatisticEntity` snapshot at close time: household/person/infant counts (new,
prolonged, updated), average persons per household, and logistics numbers (shops visited, food weight
collected, route km). Only called from `DistributionPostProcessorService`, never on-demand.

## Why `distribution` no longer depends on `reporting`

`package-info.java` declares:
```java
@org.springframework.modulith.ApplicationModule(
        allowedDependencies = {"base::exception"}
)
```
The two post-processors that used to reach into `reporting` directly (`DailyReportMailPostProcessor` →
`DailyReportService.generateDailyReportPdf()`, `StatisticMailPostProcessor` →
`StatisticExportService.exportStatisticFiles()`) were removed. Instead, `distribution` publishes a
`DistributionClosedEvent(distributionId)` — from `DistributionPostProcessorService.process()` after
close, and from `DistributionService.sendMails()` on a manual resend — and `reporting`'s
`internal.DistributionClosedListener` (a plain synchronous `@EventListener`, not
`@ApplicationModuleListener`) reacts to it, re-fetching the distribution by id and generating/emailing
the daily report PDF and statistic CSV exports itself. `reporting` is therefore now the one with an
allowed dependency on `distribution` (only for the event type), the reverse of before.

A plain `@EventListener` was chosen over `@ApplicationModuleListener` deliberately: the latter runs
async after the publishing transaction commits, which would make `sendMails()` (the manual resend,
used specifically when a mail failed to deliver) return success before actually knowing whether the
resend worked. A synchronous listener keeps `sendMails()`'s existing behavior — it still runs inline
and still throws back to the controller if mail generation/sending fails.

Within `DistributionClosedListener`, the daily-report mail and the statistic mail are isolated from
each other and each is retried up to 3 times (via a `RetryTemplate`) before being given up on - one
failing/retrying never blocks the other from being attempted, mirroring the independence they used to
have as separate `DistributionPostProcessor` beans. If either still fails after all retries, that
failure is rethrown once both have been attempted (with a second failure attached as a suppressed
exception), so `sendMails()` still surfaces a real error to the caller; the automatic post-close flow
just logs it via `DistributionPostProcessorService`'s own try/catch and moves on.

The household-list PDF (`generateHouseholdListPdf()`) uses the generic `common.pdf.PDFService` instead,
not `reporting`.

Note that `database.model.*` (entities/repositories for `household`, `logistics`, `auth`, etc.) is
**not** subject to the Spring Modulith `allowedDependencies` check — only the `modules.*` package tree
is. `DistributionService` and `MissingCostContributionPostProcessor` freely use `HouseholdRepository`,
`ShelterRepository`, and `RouteRepository` from `database.model.*` even though `household` and
`logistics` are not listed as allowed dependencies.

## `@TafelActiveDistributionRequired` — how it actually works

This is **not** the annotation name used in top-level docs (`@ActiveDistributionRequired`) — the real
class is `at.wrk.tafel.admin.backend.common.api.TafelActiveDistributionRequired`, and it's **not** an
AOP aspect. It's a plain marker annotation (`@Target(CLASS, FUNCTION)`), enforced by a Spring MVC
`HandlerInterceptor`:

```kotlin
// common/api/TafelActiveDistributionRequiredInterceptor.kt
override fun preHandle(request: ..., response: ..., handler: Any): Boolean {
    if (handler is HandlerMethod) {
        val methodAnnotation = handler.method.getAnnotation(TafelActiveDistributionRequired::class.java)
        val classAnnotation = handler.beanType.getAnnotation(TafelActiveDistributionRequired::class.java)
        if ((methodAnnotation != null || classAnnotation != null) && distributionRepository.getCurrentDistribution() == null) {
            throw TafelValidationException("Ausgabe nicht gestartet!")
        }
    }
    return true
}
```

It's registered globally in `config/WebMvcConfig.kt` for *every* controller in the app (it's also used
outside this module, e.g. `logistics/FoodCollectionsController`), not just `distribution`'s own
controllers.

**Gotcha:** this check only runs for requests dispatched through Spring MVC. Several `DistributionService`
methods (`getCurrentTicketNumber`, `reopenAndGetPreviousTicket`, `closeCurrentTicketAndGetNext`,
`assignHouseholdToDistribution`, `generateHouseholdListPdf`, `updateDistributionStatisticData`,
`updateDistributionNoteData`) call `getCurrentDistribution()!!` with a force-unwrap, assuming a
distribution is active. That assumption is only safe because every controller entry point into these
methods is annotated with `@TafelActiveDistributionRequired`. If you add a new caller that bypasses the
controller layer (another service, a `@Scheduled` job, a test calling the service directly without an
active distribution), you'll get an `NPE`, not the friendly `TafelValidationException`.

## Advisory locks: `CREATE_DISTRIBUTION` / `CLOSE_DISTRIBUTION`

Confirmed from `database/common/lock/AdvisoryLockKey.kt`:
```kotlin
enum class AdvisoryLockKey(val lockId: Long) {
    CREATE_DISTRIBUTION(1000L),
    CLOSE_DISTRIBUTION(2000L),
    LOGIN_ATTEMPT_TRACKING(3000L),
    PATCH_FOOD_COLLECTION_ITEM(4000L),
}
```
(the existing lock module's README shows stale example key names/ids that don't match this — always
read the enum itself, not the README prose there.)

Both `createNewDistribution()` and `closeDistribution()` use `advisoryLockService.tryWithLock(...)` —
the **non-blocking** variant (`pg_try_advisory_xact_lock`). If the lock is already held, the operation
doesn't wait; it fails immediately with a user-facing message ("Eine neue Ausgabe wird gerade
gestartet...", "Die Ausgabe wird gerade geschlossen...") telling the user to reload. This is a
deliberate UX choice: two admins double-clicking "start"/"close" at the same time should get a clear
error, not a hung request.

`closeDistribution()` also has a subtlety around transactions: inside the lock, it commits `endedAt` in
its own `REQUIRES_NEW` transaction *before* kicking off the `@Async` post-processor chain. The code
comments this explicitly:
```kotlin
// Use REQUIRES_NEW to ensure endedAt is committed before async post-processor runs
```
This matters because the post-processor runs on a different thread/connection — if `endedAt` were only
visible in the (still-open, lock-holding) outer transaction, the async thread's own transaction might not
see it yet.

## Ticket numbering — correction vs. common assumption

Contributors sometimes assume the backend computes/generates the next ticket number. **It doesn't.**
`AssignHouseholdRequest(householdId, ticketNumber)` carries a ticket number chosen by the *caller*
(the check-in/scanner flow); `DistributionService.assignHouseholdToDistribution()` only validates it:

```kotlin
val existingTicket = distribution.households.firstOrNull { it.ticketNumber == ticketNumber }
// Can't assign to another household if already assigned but ok if it's the same household
if (existingTicket != null && existingHousehold?.household?.id != householdId) {
    throw TafelValidationException("Ticketnummer $ticketNumber bereits vergeben!")
}
```
There is no server-side range check for the 1–999 range mentioned in top-level docs — that range is a
paper-ticket-booklet/UI convention, not something enforced in this module. The backend's only
invariant is *uniqueness of ticket number per distribution*, and it explicitly allows re-submitting the
same `(householdId, ticketNumber)` pair (used to flip `costContributionPaid` without erroring).

Once assigned, the "queue" is walked in `ticketNumber` order using the `processed` flag:
- `getFirstUnprocessedDistributionHouseholdEntity()` → who's currently being called
- `closeCurrentTicketAndGetNext()` marks the current one `processed = true` and returns the next
- `reopenAndGetPreviousTicket()` finds the *last processed* ticket and flips it back to unprocessed (for
  "oops, go back one")

## Real-time updates: outbox pattern, not raw pub/sub

Both the distribution-state stream and the ticket-screen stream go through
`database.common.sseoutbox.SseOutboxService` rather than pushing directly to open `SseEmitter`s:

1. A mutation (e.g. `closeAndNotify()` in `DistributionController`, or `saveToOutbox()` in
   `DistributionTicketScreenController`) calls `sseOutboxService.saveOutboxEntry(notificationName, payload)`,
   which persists a row to the `sse_outbox` table and fires `pg_notify` (via a DB trigger/outbox flush —
   see the sseoutbox module) on the `sse_outbox` channel.
2. `SseOutboxListenerService` holds one dedicated JDBC connection with `LISTEN sse_outbox;` and
   dispatches incoming Postgres notifications to any registered callback for that `notificationName`.
3. Each open `SseEmitter` (one per browser tab / ticket-screen display) registers a callback via
   `sseOutboxService.forwardNotificationEventsToSse(...)`, optionally filtered (e.g. the scanner-results
   stream in `checkin` filters by `scannerId`).

This means the "current" distribution/ticket state is only ever pushed on write — a newly-connecting SSE
client is fed an out-of-band "initial state" event first (`sseOutboxService.sendEvent(...)` called
directly before `forwardNotificationEventsToSse`), because the outbox mechanism only forwards *future*
notifications, not backlog.

**Note on auth:** `DistributionTicketScreenController.listenForChanges()` (the SSE endpoint for the
fullscreen ticket display) intentionally has no `@PreAuthorize`, per the class-level comment: the
physical ticket-screen monitor authenticates as a low-privilege display account, so the read-only SSE
stream is left open to any authenticated user while the state-changing endpoints
(`show-next`/`show-previous`/`show-text`) require `CHECKIN`/`SCANNER`.

## Manually re-sending mails

`POST /api/distributions/{distributionId}/send-mails` (`DistributionService.sendMails()`) re-runs the
daily report/statistic mails (by publishing `DistributionClosedEvent`, handled synchronously by
`reporting`'s `DistributionClosedListener`) and `ReturnBoxesMailPostProcessor` directly, for an
already-closed distribution — useful if a mail failed to deliver. It deliberately does **not** re-run
`MissingCostContributionPostProcessor`, since re-running that would double-count pending cost
contributions for households that already had them added when the distribution originally closed.
