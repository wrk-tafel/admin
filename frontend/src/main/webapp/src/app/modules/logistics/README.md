# Logistics Module

Frontend feature module mounted at `/logistik`, gated by the `LOGISTICS` permission
(`app.routes.ts` → `anyPermissionOf: ['LOGISTICS']`).

## What's actually here (and what isn't)

Despite the module name, and despite the backend `logistics` module covering "routes,
food collections, shelters, shops, cars, and food category management",
**this frontend module contains two screens** (`logistics.routes.ts`):
**Routen-Navi** (route guidance) at `/logistik/routen-navi`, and
**Warenerfassung** (food collection recording) at `/logistik/warenerfassung`.

The two differ in one way that is easy to miss: Warenerfassung requires an active
distribution (its constructor `effect()` navigates away once there is none, and its
nav entry carries `activeDistributionRequired`), while Routen-Navi deliberately
does not — a driver looks at the route before the day starts.

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
    route-data-resolver.component.ts                     # GET /routes
    car-data-resolver.component.ts                       # GET /cars
    food-categories-data-resolver.component.ts           # GET /food-categories/active
    food-return-categories-data-resolver.component.ts    # GET /food-return-categories/active
  services/
    food-collection-offline-queue.service.ts      # localStorage-backed item auto-save queue
    food-collection-return-items.ts               # free-text return-item validation helpers
  views/
    route-guidance/                               # route picker + one stop at a time + map deep links
    food-collection-recording/                    # container: route picker + tabs + save button
    food-collection-recording-basedata/           # tab 1: car/driver/co-driver
    food-collection-recording-km/                 # tab 2: km start/end
      dialogs/km-diff-dialog.component.ts
    food-collection-recording-items-desktop/      # tab 2, desktop layout
    food-collection-recording-items-responsive/   # tab 2, mobile layout
  logistics.routes.ts
```

## Route guidance (`routen-navi`)

`RouteGuidanceComponent` (`views/route-guidance`) takes the same `routeList`
`model.required()` input from `RouteDataResolver`, and loads
`RouteApiService.getRouteGuidance(routeId)` when a route is picked — one call that
already carries the stops in driving order, the shop details and today's progress, so
the screen needs no second request and no shop lookup of its own.

A few things about it are worth knowing before changing it:

- **One stop is on screen at a time**, and the screen is two buttons: `Erledigt & weiter` and
  `Zurück`. It is read at the wheel on a phone, where a scrollable list of fifteen stops is the
  wrong shape and every extra control is one to get wrong.
- **Moving is what records the progress.** Forward ticks the stop off and shows the next one
  (`Erledigt` on the last stop, which has nowhere to move on to, and disabled once it is done);
  back shows the previous stop and takes its tick out again. There is deliberately no separate
  "done" or "undo" control — an earlier revision had both alongside a pager and nobody could tell
  the two forward buttons apart. The tick is applied only after the server confirms it, so a driver
  is never moved past a stop that was not recorded.
- **The map link is only a link.** Starting the navigation changes no progress; it opens in its own
  window and the same stop stays on screen.
- **Navigation is a link, not a map.** Each stop renders an `<a href>` to
  `https://www.google.com/maps/dir/?api=1&destination=<address>`, plus one link over the
  stops still open that adds the intermediate ones as `waypoints`. Google's directions
  URL takes at most nine waypoints, so that link covers the next ten stops and the
  screen says so when it truncates. The reasoning is ADR-0040
  (`docs/architecture/adr/0040-route-navigation-by-map-app-deep-link.md`).
- **Ticking a stop is a `PUT` per stop**, and the response replaces that one stop in the
  signal rather than triggering a reload — the list must not jump under a driver's thumb.
  `pendingStopId` disables the buttons while a request is out.
- **Progress is per calendar day and shared**, so a second person opening the same route
  sees the same ticks; the completion's timestamp and the employee who set it are shown. The
  counter in the card header and the bar below it both render `progressLabel()`, so the figure a
  screen reader hears off the bar is the one on screen.
- **Reaching the last stop is announced**, once per route per day: the backend publishes
  `RouteAtLastStopEvent` when everything but the final stop is ticked off, and the `push` module
  turns it into a notification naming the route. Nothing in this component is involved.
- **The return boxes on the screen come from the route's last trip**, computed server-side
  (see the backend module README) — the component only renders `stop.returnItems` and the
  `unassignedReturnItems` block. The `PUT` answer carries them as well, which is why
  replacing a single stop with the response is safe.

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

### One save button for both tabs

The **Speichern** button lives on the container, *below* the tab group, and saves
every section regardless of which tab is open. Each child section exposes the same
three-method contract to the container rather than owning a save button itself:
`markAllAsTouched()`, `hasInvalidInput()`, and `saveRequest()`/`saveRequests()`
returning cold observables (or `null`/`[]` when there's nothing complete to send).
`saveAllSections()` collects them, names any section it had to skip in a warning
toast, and reports one success/error for the whole screen.

Two things to keep in mind when adding a section:

- The requests are run through `concat(...)`, **strictly sequentially, not
  `forkJoin`**. Every food-collection endpoint creates the route's food collection
  if it doesn't exist yet, so parallel requests race on that insert and violate the
  `(distribution, route)` unique constraint.
- Only the item layout matching the current viewport exists (see below), so the
  container picks the active one via a `BreakpointObserver` signal instead of
  saving both.

### Tab 1 — Basedata (`food-collection-recording-basedata`)

Car selection and driver/co-driver assignment for the route/vehicle combination —
the data the team fills in at departure. The odometer readings deliberately do
*not* live here (see the km section below).

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
- When switching routes, the effect resets the whole form and, if a saved
  `FoodCollectionData` exists for the new route, re-populates it — including
  re-triggering the employee search via `setTimeout(...)` so the search-create
  component's internal state re-syncs after view stabilization (zoneless mode
  means this can't rely on a digest cycle).

### Tab 2 — Km (`food-collection-recording-km`)

`kmStart`/`kmEnd` sit on the *items* tab, not with the base data: they're read off
the car when it's back with the goods, at the same moment the amounts are counted.
The component renders once in the tab container, but its **position depends on the
layout**: above the desktop grid, which is filled in one go once the car is back,
and *below* the responsive wizard, where the co-driver counts shop by shop while
still on the road and only knows the mileage at the very end.

- Both values are **optional**, but only as a pair — a form-level cross-field
  validator (`createKmValidation()`) rejects one-without-the-other
  (`kmIncomplete`) as well as `kmStart >= kmEnd` (`kmValidation`). A food
  collection legitimately exists with base data and no mileage yet, which is why
  `saveRequest()` simply returns `null` while the fields are empty.
- If `kmEnd - kmStart > 350`, the container opens `KmDiffDialogComponent` for
  confirmation before saving anything — a sanity check against fat-fingered
  odometer entry.

### Tab 2 — Items (desktop vs. responsive)

`FoodCollectionRecordingItemsDesktopComponent` and
`FoodCollectionRecordingItemsResponsiveComponent` are switched with an `@if` on
the container's `isDesktopLayout` signal (a `BreakpointObserver` on the Tailwind
`md` breakpoint, `min-width: 768px`), so **only one of them exists at a time**.
That matters for the single save button: the container asks the active layout for
its save requests, and a hidden-but-instantiated layout would otherwise overwrite
freshly saved data with its own stale form state.

- **Desktop** (`items-desktop`): a full grid — one `FormArray` row per food
  category, each containing a nested `FormArray` of per-shop amount inputs — saved
  in one batch via `FoodCollectionsApiService.saveItems()`.
- **Responsive** (`items-responsive`): a one-shop-at-a-time flow using
  `TafelCounterInputComponent`, with prev/next navigation between shops
  (`selectPreviousShop`/`selectNextShop`) and `findNextUnfilledShop()` to jump to
  the first incomplete shop on load. Every keystroke hands the change to
  `FoodCollectionOfflineQueueService`, which persists it in `localStorage`, sends
  it as an individual PATCH (`FoodCollectionsApiService.patchItems`), and retries
  once connectivity returns — the co-driver uses this screen on their phone on the
  road. The queue sends **one at a time**, never in parallel: a slower earlier
  request would otherwise overwrite a value typed afterward.
- The responsive `loadEffect` wraps its body in `untracked()`. Selecting a shop
  both reads and writes `categoryValues`/`returnCategoryValues`, so without it the
  effect re-triggers itself on every shop load and spins.

### Section panels

Both item layouts render two titled, colour-coded panels — **Warenmenge** (green) and
**Retourware** (amber), each with a subtitle saying which direction the boxes travel — so the
two kinds of counting can't be confused at a glance. The rows inside a panel's table carry no
background of their own, so they always sit flush on the panel's tint and the whole block reads
as one surface; the only row background is `bg-red-100` on an invalid row, which is meant to
break out of it. The km fields above them get
a plain heading and deliberately no panel: they belong to the route, not to a shop's counts.

### Retourware (both layouts)

Return boxes are stored by free-text `description`, not by category
(`FoodCollectionsApiService.saveReturnItems` / `saveReturnItemsPerShop`), and are
rendered in their own visually separated block. The block has two parts:

- pre-filled counters for the return categories, which arrive as their own
  `foodReturnCategories` input (resolved from `/food-return-categories/active`,
  separate master data from `foodCategories`) — these are labels only; saving one
  sends a return item whose `description` is the category's name
- **Sonstige Retourware**: a `FormArray` of free-text rows (`description` +
  `amount`, plus a shop picker on desktop where one screen covers all shops)

`services/food-collection-return-items.ts` holds
`duplicateDescriptionValidator()`, which rejects a row repeating another row for
the same shop or one of the category names — two rows with the same description
would collapse into one on save. It's attached **lazily**
(`attachReturnItemsValidator()`), not at form construction: it reads the
`foodCategories` `model.required()` input, which throws while still unset.

Return rows are not part of the offline queue. On the responsive layout they're
sent when the shop changes and by the save button; on desktop, by the save button
only.

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
- `food-return-categories-api.service.ts` — same split for the return-box
  categories, maintained in `settings/views/food-return-categories`.
- `food-collections-api.service.ts` — `FoodCollectionsApiService`, the
  read/save/patch endpoints described above. Note that route base data, km, items
  and return items each have their own endpoint, matching the sections of the
  screen.
- `employee-api.service.ts` — used by the driver/co-driver search-and-create
  flow.
