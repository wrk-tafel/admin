# Logistics Module

This module covers everything needed to plan and record a distribution's food-collection
logistics: **routes** (with their shops), **food collections** (what was picked up, by whom, in
which car), **food categories** (the weighing/return catalog), **shelters** (delivery
destinations), **shops** (pickup points), and **cars** (the vehicle fleet).

## Module boundary

```java
@org.springframework.modulith.ApplicationModule(
    allowedDependencies = {"base::exception", "base::employee"}
)
```

- `base::exception` — for `NotFoundException`/`BusinessRuleException`, thrown by every service here
  on not-found/invalid-reference (see below).
- `base::employee` — **not** for generic "created/updated by" change tracking (this module's
  entities don't have that; `BaseChangeTrackingEntity` only carries `createdAt`/`updatedAt`
  timestamps, no employee FK). It's needed because `FoodCollectionEntity` has two real,
  first-class relations to an employee: `driver` and `coDriver` (`driver_employee_id` /
  `co_driver_employee_id` columns), and `FoodCollectionService` maps those through
  `EmployeeRepository` into the shared `Employee` model.

**Only `modules/*` packages are subject to this boundary check.** Entities under
`database/model/logistics/*` are *not* — they're shared infrastructure, and other modules reach
into them directly without needing to be declared as an `allowedDependency` here:
- `reporting.DailyReportService` and `distribution.DistributionService` both query
  `ShelterRepository` directly (not through `ShelterService`).
- `FoodCollectionService` itself pulls in `DistributionEntity`/`DistributionRepository` /
  `getCurrentDistribution()` from `database.model.distribution` the same way, even though
  `logistics` has no declared dependency on the `distribution` module.

So don't assume the `allowedDependencies` list tells you everything this module talks to at the
DB level — it only governs `modules`-to-`modules` traffic.

## Components by sub-area

### Routes & shops (`RouteController`, `ShopsController`, `internal/RouteService`, `internal/ShopService`)
- `RouteEntity` (`routes`) has a `number` (`Double`, allows things like route "2.1"), a `name` and
  an `enabled` flag, plus `stops: MutableList<RouteStopEntity>` (mapped by `route`, table
  `routes_stops`, `cascade = [CascadeType.ALL], orphanRemoval = true`).
- The `number` is an ordering/identification field, not a label: it is used to sort routes and to
  address them in the API, never to name one in text a user reads. Anywhere a route has to be named
  — a validation message (`DistributionService.validateClose()`), the "Route" column of the
  `TOeT_Spenden` CSV export — use its `name`, which already carries the number ("Route 2"). Printing
  the raw `Double` would read as "2.0" anyway.
- `RouteStopEntity` links a route to a `ShopEntity` at a given `time` (`LocalTime`), with a free
  `description`. The shop is nullable — a stop can be a pause or anything else that isn't a pickup.
  `routes_stops` is unique on both `(route_id, shop_id)` and `(route_id, time)`, so a route visits
  each shop once and has one stop per time.
- **A stop is only replaced when its own content actually changed.** `RouteRequest`'s `RouteStopItem`
  carries no id the frontend round-trips (the edit dialog's form never had one), so `updateRoute()`
  diffs by content instead: a stop that comes back with the exact same `time`/`shopId`/`description`
  as an existing one keeps that existing row untouched — no delete, no insert, its id and driver-
  guidance completions (see below) survive. A stop whose content genuinely differs is still replaced
  like shelter contacts below, with an explicit `saveAndFlush()` between removing the changed/dropped
  stops and re-adding the changed/new ones. Without that flush the inserts can reach the database
  before the corresponding removals are deleted, and re-using a shop or a time one of the removed
  stops still occupies then violates one of `routes_stops`' unique constraints. `RouteServiceIT`
  covers exactly that case (swapping two stops' times, which counts as a genuine change for both).
- **`time` is the ordering key, there is no `sortOrder`.** Both `RouteService.getAllRoutes()` and
  `ShopService.getShopsForRouteId()` sort a route's stops by `time`; routes and shops themselves
  sort by their `number`. This is the one piece of sortable master data here that is *not* the
  drag-and-drop `sortOrder` pattern used by shelters/cars/categories.
- `ShopEntity` (`shops`) embeds `ShopAddress` (`address_street`/`address_postal_code`/
  `address_city`) and carries a `foodUnit: FoodUnit` (`BOX` or `KG`) — this drives weight
  calculation in food collections (see below) — plus an `enabled` flag. `number` is unique, checked
  in `ShopService` before saving so a duplicate surfaces as a `BusinessRuleException` rather than a
  constraint violation.
- `ShopService.getShopsForRouteId(routeId)` is what the food-collection recording screen sees: it
  loads the route, sorts its stops by `time`, and maps each stop's shop, **skipping disabled ones**.
  `RouteController.getActiveRoutes()` (`GET /api/routes/active`) does the same for routes.
- **Neither routes nor shops can be deleted** — `food_collections.route_id`,
  `food_collections_items.shop_id` and `food_collections_return_items.shop_id` all reference them,
  so recorded history would break. The `enabled` flag is the only way to retire one; disabling
  keeps every past food collection intact.
- **Deactivating a shop removes its stops from every route** (`ShopService.updateShop` →
  `removeShopFromAllRoutes`): routes only ever hold stops that are actually driven to. Re-enabling
  the shop does not restore the stops. The settings screen warns before this happens
  (`shop-disable-confirm-dialog`), and today's completions of a removed stop go with it
  (`on delete cascade`, see route guidance below).
- **Permission split, same shape as cars/food categories:** `getActiveRoutes()` and
  `getShopsOfRoute()` require `LOGISTICS` (the recording screen), while the full list plus
  create/update on both controllers require `SETTINGS` (the maintenance screens under
  `/einstellungen/routen` and `/einstellungen/filialen`).

### Route guidance (`RouteGuidanceController`, `internal/RouteGuidanceService`)
- Serves the `/logistik/routen-navi` screen: `GET /api/routes/{routeId}/guidance` returns the route's
  stops in driving order with everything a driver on the road needs (address, phone, contact
  person, shop note, food unit), and `PUT /api/routes/{routeId}/guidance/stops/{stopId}` ticks a
  stop off or undoes it. Both require `LOGISTICS`.
- **This read model is not `getShopsForRouteId`'s, and the difference is deliberate.** That one
  serves the recording screen and drops what it cannot record against: stops without a shop.
  Guidance keeps those — a driver is sent to every stop the route still holds, and silently
  omitting one would leave a gap on the road. (Disabled shops need no handling on either screen:
  their stops are removed from the routes when the shop is deactivated, see above.)
- **Progress is keyed by `(route_stop, calendar date)`, not by a distribution**
  (`routes_stops_completions`, `RouteStopCompletionEntity`). The screen is reachable without an
  active distribution on purpose — a driver looks at the route before the day starts — so a
  distribution key would leave it unusable exactly then. The date comes from the server's
  `LocalDate.now()` and is never accepted from the client.
- **A completion is deleted with its stop** (`on delete cascade` on `route_stop_id`) — so a route
  edit in the settings screen only drops today's progress for a stop whose own `time`/`shopId`/
  `description` actually changed. A stop that comes back unchanged keeps its row (see
  `RouteService.updateRoute` above) and its completions with it, so a purely cosmetic edit like
  renaming the route no longer wipes a driver's progress for the day. `RouteGuidanceServiceIT` pins
  down both halves of this: a stop whose content changes still drops its completion, one that
  doesn't keeps it.
- Ticking an already-ticked stop is a no-op rather than a re-stamp: the stored `createdAt` is what
  tells a second driver when the stop was actually done.
- **Ticking a stop off is wrapped in
  `advisoryLockService.withLock(AdvisoryLockKey.ROUTE_STOP_COMPLETION)`** (lock id `9000L` in
  `AdvisoryLockKey`, see the advisory-lock README): the find-then-insert against
  `(route_stop_id, completion_date)`'s `UNIQUE` constraint is a check-then-act, and the screen is
  explicitly designed for two people on one van (driver and co-driver) — without the lock, both
  ticking the same stop at the same moment would find nothing and both insert, and the loser would
  get a duplicate-key 500 instead of the completion the other one just recorded.
- **Arriving at the last stop publishes `RouteAtLastStopEvent`** — every stop but the final one
  ticked off, which is the point at which the van is about to head back and the people unloading it
  want to know. `routes.last_stop_notified_date` keeps that to one announcement per route per day,
  claimed atomically by `RouteRepository.markLastStopNotified` the same way
  `DistributionRepository.markFoodCollectionCompleted` does; a driver who takes a stop back and
  ticks it off again passes the same point twice and must not announce it twice. A one-stop route
  never triggers it.
- **The return boxes come from the route's *previous* food collection**, not the current one:
  `findFirstByRouteIdAndDistributionIdNotOrderByDistributionStartedAtDescIdDesc` excludes the
  running distribution, because a `food_collections` row for today is created the moment anyone
  opens the recording screen and would otherwise shadow the trip whose boxes are still in the hall.
  A recorded amount of `0` is filtered out - it means "nothing came back", not an empty crate.
- Boxes recorded for a shop the route no longer stops at land in `unassignedReturnItems` rather than
  being dropped, so a route edit cannot silently strand them. The `PUT` answer carries the stop's
  return items too: the screen replaces that one stop with the response, so leaving them off would
  make them vanish the moment a driver ticks the stop.

### Shelters (`SheltersController`, `internal/ShelterService`)
- `ShelterEntity` (`shelters`) holds a full address (street/house number/stairway/door/postal
  code/city), a `personsCount`, an `enabled` flag, and `sortOrder` (added recently alongside
  drag-and-drop reordering in the UI). Contacts are a `@OneToMany` to `ShelterContactEntity`
  (table `shelters_contacts`) with `cascade = [CascadeType.ALL], orphanRemoval = true`.
- **Contacts are wholesale-replaced on every update**, not diffed: `updateShelter()` builds a
  fresh `mutableList` of brand-new `ShelterContactEntity` instances and assigns it to
  `shelterEntity.contacts`. This only works correctly because of `orphanRemoval = true` — it's
  what causes Hibernate to delete the previously-attached contact rows that are no longer
  referenced. If that cascade setting is ever removed, this update logic will silently leak
  orphaned contact rows instead of failing loudly.
- Sort order pattern (identical to food categories, see below): `createShelter()` calls
  `nextSortOrder()` = `(max existing sortOrder ?: 0) + 1`; `reorderShelters(shelterIds)`
  re-numbers strictly by the order the client sent, `index + 1`, with no gap-preservation.
  `getActiveShelters()`/`getAllShelters()` both sort by `(sortOrder, name)`.
- **No `LOGISTICS`/`SETTINGS` permission gate on this controller** — `SheltersController` is
  annotated only `@PreAuthorize("isAuthenticated()")` at the class level, so *any* logged-in user
  can create/update/reorder shelters, unlike food categories (see below) which require
  `SETTINGS`. Confirm this is intentional before assuming permission parity across logistics
  sub-areas.
- Shelters are read cross-module (via `ShelterRepository` directly, bypassing `ShelterService`)
  by `reporting.DailyReportService` and `distribution.DistributionService` — e.g. the "respect
  shelter sortOrder in dashboard/daily report PDF" behavior lives in those consumers, not here.

### Cars (`CarsController`, `internal/CarService`)
- `CarEntity` (`cars`) is `licensePlate` + `name`, plus `enabled`/`sortOrder` (added alongside the
  "maintain cars" settings page, mirroring shelters). `CarService` exposes `getActiveCars()`
  (`enabled = true`, used by the food-collection recording car dropdown) and `getAllCars()`
  (used by the settings maintenance page) plus `createCar()`/`updateCar()`/`reorderCars()` —
  same `nextSortOrder()`/`reorderCars(index + 1)` pattern as shelters/food categories.
- **Permission split, same shape as food categories:** `getActiveCars()` requires
  `isAuthenticated()` (frontend route-level `LOGISTICS` gating already restricts who reaches it),
  while `getAllCars()` plus create/update/reorder all require `SETTINGS`.
- `deleteCar()` is a real hard delete, unlike shelters/food categories which only ever get
  soft-disabled via `enabled` — a car is never snapshotted anywhere in reporting (see
  `FoodCollectionEntity`), so nothing depends on an old car's name/plate surviving. The only thing
  that can block it is an actual recorded food collection: `FoodCollectionRepository.existsByCarId`
  is checked up front and turned into a `ConflictException` (409) rather than letting the
  database's own FK `RESTRICT` on `food_collections.car_id` surface as a raw error. `enabled` is
  still the everyday way to retire a car from the dropdown; delete only ever succeeds for a car
  that was created and never actually used on a route.

### Food categories (`FoodCategoriesController`, `internal/FoodCategoryService`)
- `FoodCategoryEntity` (`food_categories`) has `weightPerUnit` (`BigDecimal`), `sortOrder`, and
  `enabled`. Every row here is a weighed donation category — return boxes are a separate table
  entirely (see below).
- `getActiveFoodCategories()` filters on `enabled`; `getAllFoodCategories()` returns everything for
  the settings screen. Both sort by `(sortOrder, name)`.
- **Permission split despite living in the `logistics` module:** `getActiveFoodCategories()`
  requires `LOGISTICS`, but `getAllFoodCategories()` plus create/update/reorder all require
  `SETTINGS`. Category master-data maintenance is gated as a settings concern even though the
  code sits in `logistics`.

### Food return categories (`FoodReturnCategoriesController`, `internal/FoodReturnCategoryService`)
- `FoodReturnCategoryEntity` (`food_return_categories`) is `name` + `sortOrder` + `enabled` and
  nothing else — deliberately **not** a flavour of `FoodCategoryEntity`. Return boxes are counted,
  never weighed, so there's no `weightPerUnit`; and no food collection ever references one, so
  there's no FK to it either.
- These rows only *label* the pre-filled counters of the recording screen's return section. What
  actually gets stored when a counter is saved is a `FoodCollectionReturnItemEntity` whose
  `description` is this category's `name` — exactly the shape a hand-typed row produces (see food
  collections below). Renaming a category therefore does not rewrite already-recorded boxes, which
  is intended: the recorded description is what the shop was actually told.
- Same shape and permission split as food categories and the other sortable master data
  (`nextSortOrder()` = max+1 on create, `reorder(ids)` = re-number by client order as `index + 1`,
  `/active` requires `LOGISTICS`, everything else `SETTINGS`).
- Consumed by `reporting.DistributionClosedEventListener` (via `FoodReturnCategoryRepository`
  directly) to order the Retourkisten mail the same way the recording screen orders its counters.

### Food collections (`FoodCollectionsController`, `internal/FoodCollectionService`)
This is the most involved sub-area — it records what a route's team actually picked up.
- Every endpoint is annotated `@TafelActiveDistributionRequired` and resolves "the" food
  collection via `distributionRepository.getCurrentDistribution()!!` — food collections only
  exist in the context of the currently-open distribution. There is exactly one
  `FoodCollectionEntity` per `(distribution, route)` pair, enforced by the DB unique constraint
  `food_collections_uk (distribution_id, route_id)`. All the save paths
  (`saveRouteData`/`saveItems`/`saveItemsPerShop`/`patchItem`) follow the same
  find-existing-by-`(distribution, route)`-or-create-new pattern
  (`getOrCreateFoodCollectionEntity` / inline equivalents), then `save()` (upsert).
- `FoodCollectionItemEntity` (table `food_collections_items`) is an `@Embeddable`
  `@ElementCollection`, **not** its own JPA entity — it has no independent identity/repository,
  only exists as part of `FoodCollectionEntity.items`, and is always loaded/replaced together with
  its parent. The DB unique constraint is `(food_category_id, shop_id, food_collection_id)`.
- **Return boxes are free text, not items.** `FoodCollectionReturnItemEntity` (table
  `food_collections_return_items`, also an `@Embeddable` `@ElementCollection`) carries
  `shop` + `description` + `amount` and no category at all, so a team can record a box that isn't
  in the catalog. `FoodReturnCategoryEntity` rows are only the recording screen's pre-filled
  counters — saving one stores a return item whose `description` is the category's name, exactly
  like a hand-typed row. Only amounts `> 0` are stored; a zero is the absence of a row. Return
  boxes are never weighed, so unlike items they have no `weight` and contribute nothing
  to food-amount statistics — their one consumer is the "Retourkisten" mail in
  `reporting.DistributionClosedEventListener`.
- **Race condition guard, second instance:** both return-item save paths
  (`saveReturnItems`/`saveReturnItemsPerShop`) wrap their read-modify-write in
  `advisoryLockService.withLock(AdvisoryLockKey.SAVE_FOOD_COLLECTION_RETURN_ITEMS)`. Hibernate
  rewrites the whole element collection on any change, so a concurrent per-shop save for another
  shop of the same route would otherwise drop the rows this one just wrote.
- **Race condition guard:** `saveRouteData()`, `saveKm()`, `saveItems()`, `saveItemsPerShop()` and
  `patchItem()` all wrap their find-or-create of the `(distribution, route)` row and/or their
  read-modify-write (or, for `saveItems`, outright replace) of `items` in the same
  `advisoryLockService.withLock(AdvisoryLockKey.PATCH_FOOD_COLLECTION_ITEM)` (lock id `4000L` in
  `AdvisoryLockKey`). Without a shared lock, a mobile per-shop save for one shop, a mobile save for
  another shop of the same route, and the desktop autosave's `PATCH /items` would each read the
  same `items` snapshot and the later commit would silently drop the earlier one's rows;
  `patchItem`'s own original hazard (two concurrent patches for the same category/shop both
  inserting and violating the `food_collections_items_pk` unique constraint), and `saveRouteData`/
  `saveKm`'s (two concurrent saves for a route with no row yet both inserting and violating
  `food_collections_uk`), are the same underlying race with a duplicate key instead of lost data as
  the visible symptom (issue #3602). If you add another read-modify-write or find-or-create path
  against a food collection's row, it needs this lock too. See `database/common/lock/README.md` for
  the advisory-lock mechanism itself.
- **Shop-belongs-to-route guard:** every path that writes an item/return item under a caller-given
  `shopId` validates it against `route.stops` via `validateShopIsRouteStop` before saving —
  including the route-level bulk endpoints (`saveItems`, `saveReturnItems`), which validate every
  item's `shopId` individually since a bulk request can mix shops. Without it, a client bug pairing
  one route's id with another route's shop (see #3527) would silently store the item under the
  wrong route instead of failing loudly, and would surface later as `unassignedReturnItems` in
  route guidance/exports.
- `kmStart`/`kmEnd` are nullable at the DB level (migration `R__00061_food_collections_nullable`
  dropped their original `NOT NULL`) — a food collection can exist before mileage is recorded, and
  they have their own endpoint (`POST /routes/{routeId}/km`) separate from the route's base data
  because they're read off the car on return, long after car/driver/co-driver are known.
- `FoodCollectionItemEntity.weight` is where the shop's `foodUnit` and the category's
  `weightPerUnit` come together: if the shop's unit is `KG`, `amount` *is* the weight; otherwise
  weight = `amount * category.weightPerUnit`. Get the shop's unit wrong and every subsequent
  weight-based report/statistic derived from this collection is wrong too.
- **The weight is stored, not derived on read.** `weight` is computed once, when the item is
  written, and persisted on `food_collections_items` (column added in `R__00086`). `foodUnit` and
  `weightPerUnit` are master data an operator can edit at any time, so recomputing on every read
  would rewrite the kg of distributions that closed long ago —
  `distributions_statistics.food_total_amount` is frozen at close time and the `TOeT_Spenden`
  export would stop agreeing with it. `updateAmount()` is therefore the only way to change an
  item's `amount`; it recomputes `weight` in the same step so the two can't drift apart.
- **The route name, shop number and category name are stored the same way (`R__00108`)**:
  `FoodCollectionEntity.routeName` and `FoodCollectionItemEntity.shopNumber`/`.categoryName` are
  snapshotted once, from `route.name`/`shop.number`/`category.name`, when the row is recorded -
  `route`/`shop`/`category` themselves stay as live FKs (needed for the amount/weight lookups,
  which match by id and are unaffected by a rename). `FoodCollectionEntity.route` can only be
  changed via `updateRoute()`, which keeps `routeName` in sync the same way `updateAmount()` keeps
  `weight` in sync; `shop`/`category` on an item are never reassigned after construction. Without
  this, renaming a route/shop/category in the settings screens would retroactively rewrite the
  "Route"/"Spender"/per-category columns of the `TOeT_Spenden` export for distributions that
  already happened.

## Persistence gotchas — summary

- Unlike `household` (which needs a genuine two-step save because `households` and `persons`
  mutually reference each other), nothing in `logistics` needs that pattern — none of these
  entities have circular FK relationships.
- Several independent "drag-and-drop sortOrder" implementations exist (shelters, cars, food
  categories, food return categories) with essentially copy-pasted logic (`nextSortOrder()` =
  max+1 on create, `reorder(ids)` = re-number by client-supplied order as `index + 1`). If you
  touch one, check whether the same fix applies to the others.
- Remember that `database/model/logistics/*` entities/repositories are freely reachable from any
  other module (they're outside the Modulith-enforced `modules/*` tree) — grep for
  `ShelterRepository`, `FoodCollectionRepository`, etc. before assuming a change here is
  logistics-only.
