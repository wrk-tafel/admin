# Logistics Module

Frontend feature module mounted at `/logistik`, gated by the `LOGISTICS` permission
(`app.routes.ts` → `anyPermissionOf: ['LOGISTICS']`).

## What's actually here (and what isn't)

Despite the module name, and despite the backend `logistics` module covering "routes,
food collections, shelters, shops, cars, and food category management",
**this frontend module contains a single screen**:
**Warenerfassung** (food collection recording), reachable at `/logistik/warenerfassung`
via `logistics.routes.ts`.

There is no route/shop/car management UI, and shelter and food-category admin
screens are **not** here — they live in the
[`settings` module](../settings/README.md) (`views/shelters`,
`views/food-categories`). This module only *reads* routes, shops, cars and food
categories to populate the recording form; it never creates or edits them.

## Structure

```
logistics/
  components/
    tafel-employee-search-create.component.ts   # driver/co-driver lookup widget
    dialogs/
      create-employee-dialog.component.ts        # shown when search finds 0 matches
      select-employee-dialog.component.ts         # shown when search finds >1 matches
  resolver/
    route-data-resolver.component.ts              # GET /routes
    car-data-resolver.component.ts                # GET /cars
    food-categories-data-resolver.component.ts    # GET /food-categories/active
  views/
    food-collection-recording/                    # container: route picker + tabs
    food-collection-recording-basedata/           # tab 1: car/driver/km
      dialogs/km-diff-dialog.component.ts
    food-collection-recording-items-desktop/      # tab 2, desktop layout
    food-collection-recording-items-responsive/   # tab 2, mobile layout
  logistics.routes.ts
```

## Food collection recording (`warenerfassung`)

`FoodCollectionRecordingComponent` (`views/food-collection-recording`) is the
container. It receives `routeList`, `carList` and `foodCategories` as
`model.required()` inputs, pre-populated by the three resolvers above via
`logistics.routes.ts`'s `resolve: {...}` block — all three fire in parallel before
the route activates. Selecting a route from the `<select>` triggers
`onSelectedRouteChange()`, which `forkJoin`s the existing food-collection data for
that route (`FoodCollectionsApiService.getFoodCollection`) with the shops assigned
to it (`RouteApiService.getShopsOfRoute`) and publishes both as a
`SelectedRouteData` signal. That signal — and the `SelectedRouteData` interface
itself, exported from this file — is what the two tabs below consume; there's no
shared state service, just this one exported interface passed down as `input()`.

The component redirects back to `uebersicht` via an `effect()` if no distribution
is currently active (`GlobalStateService.getCurrentDistribution()`), consistent
with the `tafelIfDistributionActive` pattern used elsewhere in the app.

### Tab 1 — Basedata (`food-collection-recording-basedata`)

Car selection, driver/co-driver assignment, and start/end odometer (`km`) entry
for the route/vehicle combination.

- Driver and co-driver are each picked via a
  `TafelEmployeeSearchCreateComponent` (in `components/`). Typing a personnel
  number and triggering the search (`triggerSearch()`) branches three ways:
  exactly one match auto-emits `selectedEmployee`; more than one opens
  `SelectEmployeeDialogComponent` (paginated picker); zero matches opens
  `CreateEmployeeDialogComponent` (inline employee creation). Both dialogs close
  with the chosen/created `EmployeeData`, which the parent's
  `setSelectedDriver`/`setSelectedCoDriver` then feeds into a
  `CustomValidator.hasValue(...)` validator on the corresponding search-input
  control — so the text field itself is what's marked invalid until a concrete
  employee has actually been resolved, not just typed.
- `km` fields carry a form-level cross-field validator
  (`createKmValidation()`) that sets an error on `kmEnd` whenever
  `kmStart >= kmEnd`.
- If `kmEnd - kmStart > 350`, saving opens `KmDiffDialogComponent` for
  confirmation before actually persisting (`save(overrideKmDiff = true)` on
  confirm) — a sanity check against fat-fingered odometer entry.
- When switching routes, the effect resets the whole form and, if a saved
  `FoodCollectionData` exists for the new route, re-populates it — including
  re-triggering the employee search via `setTimeout(...)` so the search-create
  component's internal state re-syncs after view stabilization (zoneless mode
  means this can't rely on a digest cycle).

### Tab 2 — Items (desktop vs. responsive)

Both `FoodCollectionRecordingItemsDesktopComponent` and
`FoodCollectionRecordingItemsResponsiveComponent` are **always both instantiated**
in `food-collection-recording.component.html`; there's no `@if` switching between
them. Visibility is purely a Tailwind class toggle:

```html
<div class="hidden md:block"><tafel-food-collection-recording-items-desktop .../></div>
<div class="block md:hidden"><tafel-food-collection-recording-items-responsive .../></div>
```

This is a gotcha for anyone touching either component: **both run their
`effect()`s and fire their own API calls simultaneously**, even though only one is
visible at a given viewport width. There's no lazy instantiation based on actual
breakpoint detection.

- **Desktop** (`items-desktop`): a full grid — one `FormArray` row per food
  category, each containing a nested `FormArray` of per-shop amount inputs — saved
  in one batch via `FoodCollectionsApiService.saveItems()`.
- **Responsive** (`items-responsive`): a one-shop-at-a-time flow using
  `TafelCounterInputComponent`, with prev/next navigation between shops
  (`selectPreviousShop`/`selectNextShop`) and `findNextUnfilledShop()` to jump to
  the first incomplete shop on load. Every keystroke triggers an individual PATCH
  (`FoodCollectionsApiService.patchItems`) rather than a batch save. These patches
  are queued and sent **one at a time** (`itemPatchQueue` / `itemPatchInFlight`)
  instead of firing in parallel — a fix for a race condition where a slower
  earlier request could overwrite a value typed afterward (see commit
  `01e32338`, "Fix race condition overwriting food collection amounts on rapid
  input"). If you touch this queuing logic, keep the serialization: parallel
  PATCHes reintroduce the bug it fixed.

## Resolvers

`RouteDataResolver`, `FoodCategoriesDataResolver` and `CarDataResolver`
(`resolver/`) are plain data-fetching resolvers wired into
`logistics.routes.ts`'s `resolve` map. Note they're decorated with `@Service()`
(this repo's convention/alias, imported from `@angular/core` — not
`@Injectable()`), consistent with every other resolver and API service in the
codebase.

## API services

All HTTP calls go through services in `app/api/` (per the project convention —
API services live outside `modules/`, suffixed `-api.service.ts`), not inside
this module:

- `route-api.service.ts` — `RouteApiService` (`GET /routes`,
  `GET /routes/{id}/shops`), exports the `Shop`/`RouteData`/`RouteList` shapes
  used throughout this module.
- `car-api.service.ts` — `CarApiService` (`GET /cars` only — no create/update).
- `food-categories-api.service.ts` — `FoodCategoriesApiService`; this module only
  calls `getActiveFoodCategories()` (enabled categories for the recording form).
  The full CRUD + reorder methods (`getAllFoodCategories`, `createFoodCategory`,
  `updateFoodCategory`, `reorderFoodCategories`) exist on the same service but are
  only consumed from `settings/views/food-categories`.
- `food-collections-api.service.ts` — `FoodCollectionsApiService`, the
  read/save/patch endpoints described above.
- `employee-api.service.ts` — used by the driver/co-driver search-and-create
  flow.
