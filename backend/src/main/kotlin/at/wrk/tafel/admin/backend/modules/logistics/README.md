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

- `base::exception` — for `TafelValidationException`, thrown by every service here on
  not-found/invalid-reference (see below).
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

### Routes & shops (`RouteController`, `internal/RouteService`, `internal/ShopService`)
- `RouteEntity` (`routes`) has a `number` (`Double`, allows things like route "2.1") and a `name`,
  plus `stops: List<RouteStopEntity>` (mapped by `route`, table `routes_stops`).
- `RouteStopEntity` links a route to a `ShopEntity` at a given `time` (`LocalTime`), with a free
  `description`.
- There is **no standalone "list all shops" endpoint**. `ShopService.getShopsForRouteId(routeId)`
  is the only way shops are surfaced to the frontend: it loads the route, sorts its `stops` by
  `time`, and maps each stop's shop. Shops are always presented in route/stop-time order, never
  independently.
- `ShopEntity` (`shops`) embeds `ShopAddress` (`address_street`/`address_postal_code`/
  `address_city`) and carries a `foodUnit: FoodUnit` (`BOX` or `KG`) — this drives weight
  calculation in food collections (see below).
- There is no standalone shop repository — `ShopService` goes through `RouteRepository` for
  everything (see above). A `RouteShopRepository` used to exist here (`JpaRepository<RouteStopEntity, Long>`,
  despite its name actually repository-managing *stops*, not shops) but was unused dead code and
  has been removed; don't recreate a shop-specific repository without checking `ShopService` first.

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
- `FoodCategoryEntity` (`food_categories`) has `weightPerUnit` (`BigDecimal`), a `returnItem`
  flag, `sortOrder`, and `enabled`.
- `returnItem` marks deposit/return-box categories ("Kisten"). `getAllFoodCategories()` explicitly
  filters these **out** (`it.returnItem != true`) with the comment that they're "out of scope for
  this admin listing — they will get their own dedicated form later" — and `nextSortOrder()` also
  only considers non-return items when computing the next slot, so return-item categories and
  regular categories effectively occupy separate sort-order sequences.
- `getActiveFoodCategories()` (used when actually recording a food collection) does **not**
  filter `returnItem` — only `enabled`. Don't assume the two listing methods return comparable
  sets.
- **Permission split despite living in the `logistics` module:** `getActiveFoodCategories()`
  requires `LOGISTICS`, but `getAllFoodCategories()` plus create/update/reorder all require
  `SETTINGS`. Category master-data maintenance is gated as a settings concern even though the
  code sits in `logistics`.

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
- **Race condition guard:** `patchItem()` wraps its read-modify-write in
  `advisoryLockService.withLock(AdvisoryLockKey.PATCH_FOOD_COLLECTION_ITEM)` (lock id `4000L` in
  `AdvisoryLockKey`). The code comment explains why: concurrent auto-save requests for the same
  category/shop would otherwise race on the read-modify-write and both try to insert the same
  item, violating the `food_collections_items_pk` unique constraint. If you add another
  read-modify-write path against `items`, consider whether it needs the same lock.
  See `database/common/lock/README.md` for the advisory-lock mechanism itself.
- `kmStart`/`kmEnd` are nullable at the DB level (migration `R__00061_food_collections_nullable`
  dropped their original `NOT NULL`) — a food collection can exist before mileage is recorded.
- `FoodCollectionItemEntity.calculateWeight()` is where the shop's `foodUnit` and the category's
  `weightPerUnit` come together: if the shop's unit is `KG`, `amount` *is* the weight; otherwise
  weight = `amount * category.weightPerUnit`. Get the shop's unit wrong and every subsequent
  weight-based report/statistic derived from this collection is wrong too.

## Persistence gotchas — summary

- Unlike `household` (which needs a genuine two-step save because `households` and `persons`
  mutually reference each other), nothing in `logistics` needs that pattern — none of these
  entities have circular FK relationships.
- Two independent "drag-and-drop sortOrder" implementations exist (shelters, food categories)
  with essentially copy-pasted logic (`nextSortOrder()` = max+1 on create,
  `reorder(ids)` = re-number by client-supplied order as `index + 1`). If you touch one, check
  whether the same fix applies to the other.
- Remember that `database/model/logistics/*` entities/repositories are freely reachable from any
  other module (they're outside the Modulith-enforced `modules/*` tree) — grep for
  `ShelterRepository`, `FoodCollectionRepository`, etc. before assuming a change here is
  logistics-only.
