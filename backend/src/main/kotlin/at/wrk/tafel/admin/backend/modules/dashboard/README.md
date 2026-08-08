# Dashboard Module

This module serves the single overview screen shown to employees while a distribution is running: registered
household count, ticket processing progress, logistics/food-collection progress, the selected shelters and
employee count for the current statistic, and free-text distribution notes. There is exactly one endpoint,
and it is a long-lived Server-Sent-Events (SSE) stream, not a request/response poll.

## Components

Only three source files (plus `package-info.java`):

- **`DashboardController`** – `GET /api/sse/dashboard`. Opens an `SseEmitter`, immediately pushes one snapshot,
  then subscribes to a single outbox notification (`dashboard_update`) and re-pushes a fresh snapshot every
  time that notification fires. It never queries the database itself.
- **`internal/DashboardService`** – Builds the `DashboardData` snapshot from scratch on every call
  (`getData()`). Looks up the current open distribution
  (`DistributionRepository.getCurrentDistribution()`), and if none is open, returns an all-null
  `DashboardData` (the frontend renders this as "no active distribution"). If one is open, it assembles
  ticket counts, registered-household count, statistics (employee count + shelter names), and logistics
  (food collections vs. total routes, total food weight).
- **`DashboardResponseModel`** (`DashboardData`, `DashboardTicketsData`, `DashboardStatisticsData`,
  `DashboardLogisticsData`) – Plain DTOs serialized straight onto the SSE stream as JSON.

## The `allowedDependencies = {}` puzzle

`package-info.java` declares this module with **no allowed dependencies on any other application module**:

```java
@org.springframework.modulith.ApplicationModule(
        allowedDependencies = {}
)
package at.wrk.tafel.admin.backend.modules.dashboard;
```

Yet the dashboard clearly needs data that "belongs" to `distribution` (registered households, tickets,
statistics) and `logistics` (routes, food collections). It gets away with this because **it never imports
anything from `modules.distribution` or `modules.logistics`**. Instead, `DashboardService` talks directly to
JPA repositories/entities under `database.model.*`:

```kotlin
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionHouseholdRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.distribution.getCurrentDistribution
import at.wrk.tafel.admin.backend.database.model.logistics.RouteRepository
```

`database.model.*` is shared persistence infrastructure, not an `ApplicationModule` package under
`modules.*` — Spring Modulith's dependency check only enforces boundaries between `modules.*` packages, so
reading shared entities/repositories directly is not a violation. In effect: **dashboard has no allowed
module dependencies because it depends on the database, not on the other modules' code.** This makes it a
read-only aggregation module by construction — it cannot call into `distribution`/`logistics` service logic,
only re-read the same rows those modules write.

One consequence worth knowing: `getStatisticsData()` reads shelter *names* off of
`DistributionStatisticEntity.shelters` rather than joining live `Shelter` rows, deliberately — see the
comment in `DashboardService`:

```kotlin
// Intentionally names, not shelter ids: statistics keep a historic copy independent of later shelter renames/deletions
```

So even the "shelter" data displayed here is a frozen snapshot captured at statistic-save time by the
`distribution` module, not a live reference — another reason dashboard doesn't need a dependency on
`logistics`' `Shelter` entities to render it correctly.

## How the SSE update actually gets triggered (the outbox flow)

The dashboard's SSE endpoint pushes an initial snapshot on connect, then waits for a
`dashboard_update` notification via `SseOutboxService.listenForNotificationEvents<Unit>(...)`. Note the
`resultType = null` / generic type `Unit` — the notification payload is **ignored on purpose**; whenever
`dashboard_update` fires, the callback just calls `dashboardService.getData()` again and pushes a brand new
snapshot. This module never has to know *what* changed, only *that* something did.

Unlike `distribution`'s or `checkin`'s SSE producers (`DistributionController`, `ScannerController`), which
call `SseOutboxService.saveOutboxEntry(...)` from Kotlin code to enqueue an outbox row, **nothing in this
module — or anywhere in application code — ever calls `saveOutboxEntry("dashboard_update", ...)`.** The
`dashboard_update` rows are inserted purely at the database level:

1. Flyway migration `R__00059_dashboard_add_notification_trigger.sql` defines
   `insert_dashboard_update_to_sse_outbox()` and attaches it as an `AFTER INSERT OR UPDATE OR DELETE` trigger
   on `distributions`, `distributions_households`, `distributions_statistics`,
   `distributions_statistics_shelters`, `food_collections`, and `food_collections_items`. Any write to any of
   those tables (by any module, through any code path — even a raw SQL migration) inserts a row into
   `sse_outbox` with `notification_name = 'dashboard_update'` and `payload = NULL`.
2. The insert is deliberately coalesced to at most one row per second:
   `current_second := date_trunc('second', NOW())` combined with a
   `UNIQUE (notification_name, event_time)` constraint and `ON CONFLICT ... DO NOTHING` — so a burst of
   writes in the same table (e.g. saving several food collection items) produces at most one dashboard
   refresh per second, not one per row.
3. A second, generic trigger from `R__00057_added_notification_procedure.sql`
   (`trigger_sse_outbox_notification` → `sse_outbox_notify_channel()`) fires on every `sse_outbox` insert
   (regardless of `notification_name`) and calls `pg_notify('sse_outbox', ...)` with the notification name and
   payload as JSON.
4. `SseOutboxListenerService` (in `database.common.sseoutbox`, shared infra, not dashboard-specific) holds a
   dedicated JDBC connection that runs `LISTEN sse_outbox;` and waits in `PGConnection.getNotifications()` in a
   background coroutine. When a notification arrives it looks up any callbacks registered for that
   `notification_name` in an in-memory map and invokes them. If that connection dies it reconnects and replays
   the `sse_outbox` rows written while it was down, since a `NOTIFY` missed by a disconnected session is gone
   for good — so a callback can see the same event twice, but shouldn't miss one. `dashboard_update` carries
   no payload at all and just makes the controller re-read the current snapshot, so a duplicate costs one
   extra query and changes nothing.
5. `DashboardController`'s call to `listenForNotificationEvents(notificationName = "dashboard_update", ...)`
   is what registered the callback in step 4. When it fires, the controller re-fetches and re-sends the
   dashboard snapshot over its own `SseEmitter`.

**Practical implication:** if you add a new table/column whose changes should be reflected on the dashboard,
you need to add a trigger for it in a new Flyway migration (following the `R__00059` pattern) — adding a
Kotlin-side event publish call in `distribution`/`logistics` will *not* make the dashboard refresh, because
the dashboard module has no code path listening for anything except the DB-level `dashboard_update`
notification.

## Gotchas

- `DashboardService.getData()` is called on every SSE push, not just once — it re-runs several JPA queries
  and one `routeRepository.findAll()` per refresh. This is fine at Tafel's data volumes but is not a
  cheap/cached read.
- If there is no currently open distribution, `getData()` returns an all-null `DashboardData`; controllers
  and the frontend must treat `null` as "nothing to show", not "zero".
- `foodAmountTotal` sums `calculateWeight()` across every item of every food collection of the *current*
  distribution only — it has no relation to the historic per-year totals computed in the `reporting` module.
