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
- `RouteStopEntity` links a route to a `ShopEntity` at a given `time` (`LocalTime`), with a free
  `description`. The shop is nullable — a stop can be a pause or anything else that isn't a pickup.
  `routes_stops` is unique on both `(route_id, shop_id)` and `(route_id, time)`, so a route visits
  each shop once and has one stop per time.
- **A route's stops are replaced wholesale on update**, like shelter contacts below — but with an
  explicit `saveAndFlush()` between clearing and re-adding them. Without that flush the inserts of
  the new stops can reach the database before the removed ones are deleted, and re-using a shop or
  a time that a removed stop still occupies then violates one of those unique constraints.
  `RouteServiceIT` covers exactly that case (swapping two stops' times).
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
- **Permission split, same shape as cars/food categories:** `getActiveRoutes()` and
  `getShopsOfRoute()` require `LOGISTICS` (the recording screen), while the full list plus
  create/update on both controllers require `SETTINGS` (the maintenance screens under
  `/einstellungen/routen` and `/einstellungen/maerkte`).

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
- **Race condition guard:** `patchItem()` wraps its read-modify-write in
  `advisoryLockService.withLock(AdvisoryLockKey.PATCH_FOOD_COLLECTION_ITEM)` (lock id `4000L` in
  `AdvisoryLockKey`). The code comment explains why: concurrent auto-save requests for the same
  category/shop would otherwise race on the read-modify-write and both try to insert the same
  item, violating the `food_collections_items_pk` unique constraint. If you add another
  read-modify-write path against `items`, consider whether it needs the same lock.
  See `database/common/lock/README.md` for the advisory-lock mechanism itself.
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
