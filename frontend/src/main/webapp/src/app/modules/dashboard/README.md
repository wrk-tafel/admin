# Dashboard Module

This module renders the "Übersicht" (overview) landing page — the operational cockpit shown
while a food distribution ("Ausgabe") is running. It shows whether a distribution is currently
open, how many customers have registered, how many tickets have been processed, how much food
has been recorded/collected, and lets staff enter end-of-day statistics (employee count, shelter
occupancy) and free-text notes. Almost everything on this page is either live (pushed via SSE) or
gated behind an active distribution.

## Live data: two independent SSE channels

The page is driven by **two separate SSE subscriptions with two separate consumers** — this is
the single most important thing to understand before touching this module.

### 1. `/sse/dashboard` — owned by `DashboardComponent`

[`dashboard.component.ts`](dashboard.component.ts) injects the shared
[`SseService`](../../common/sse/sse.service.ts) directly and converts the observable into a
signal with `toSignal()`:

```ts
readonly data: Signal<DashboardData | undefined> = toSignal(
  this.sseService.listen<DashboardData>('/sse/dashboard')
);
```

`DashboardData` carries everything that isn't already tracked globally: `registeredCustomers`,
`tickets` (processed/total), `logistics` (food collection + food amount counters, plus
`routeProgress` - the stops each route has ticked off today in the route guidance screen) and
`statistics`
(current employee count / selected shelter names) plus free-text `notes`. The template
(`dashboard.component.html`) reads `data()` and passes slices of it down as `@Input`-style
signal inputs to the presentational child components (`tafel-registered-customers`,
`tafel-tickets-processed`, `tafel-recorded-food-collections`, `tafel-recorded-route-names`,
`tafel-route-progress`, `tafel-food-amount`, `tafel-distribution-statistics-input`, `tafel-distribution-notes-input`). None of those children
know about SSE at all — they are pure `input()`-driven display/edit components. This keeps the
"how do we get fresh data" concern in exactly one place (`DashboardComponent`) and the "how do we
render it" concern in the leaf components.

Because the SSE stream only pushes deltas the backend decides are relevant, several fields on
`data()` are `undefined` on partial/initial payloads (e.g. `data()?.registeredCustomers`). The
consuming child inputs (`count`, `countProcessedTickets`, etc.) are all optional signal inputs
(`input<T>()` with no default), so they already accept `undefined` natively - no extra handling
needed in the template.

### 2. `/sse/distributions` — owned by `GlobalStateService`, consumed app-wide

The **current distribution** (open/closed state, id, start/end timestamps) is *not* part of
`DashboardData`. It's tracked globally by
[`GlobalStateService`](../../common/state/global-state.service.ts), which listens to
`/sse/distributions` once for the whole app and exposes it as a signal:

```ts
this.sseService.listen<DistributionItemUpdate>('/sse/distributions', connectionStateCallback)
  .subscribe({ next: (u) => this._currentDistribution.set(u.distribution) });
```

Several dashboard components inject `GlobalStateService` and call `getCurrentDistribution()`
directly, independently of `DashboardComponent`:

- `DistributionStateComponent` — derives `isDistributionActive` (`computed()`) from it to show
  "Geöffnet"/"Geschlossen" and toggle the start/close-distribution buttons.
- `RecordedFoodCollectionsComponent` — uses it only to decide the card's color (`panelColor`)
  when there's no active distribution yet.
- `DistributionStatisticsInputComponent` and `DistributionNotesInputComponent` — use it to
  enable/disable their form controls via an `effect()` that resets the form back to empty
  whenever the distribution closes (see `distributionEffect` in
  `distribution-statistics-input.component.ts`).

So: **"is a distribution open" flows through `GlobalStateService`/`/sse/distributions`; "what are
the current numbers" flows through `DashboardComponent`/`/sse/dashboard`.** Don't be tempted to
duplicate distribution state inside `/sse/dashboard` payloads or vice versa — the split exists so
other modules (e.g. `checkin`, `logistics`) can reuse `GlobalStateService` without depending on
this module.

`SseService.listen()` auto-reconnects on `EventSource` errors (1s backoff, see
`common/sse/sse.service.ts`) and reports connection health via an optional callback —
`GlobalStateService` wires that into `_connectionState`, but `DashboardComponent` currently
ignores the callback param entirely for `/sse/dashboard`.

## Folder structure

```
dashboard/
  dashboard.component.ts / .html / .spec.ts   # page shell, owns the /sse/dashboard subscription
  dashboard.routes.ts                          # single '' route, resolves sheltersData
  resolver/
    dashboard-shelters-resolver-component.service.ts  # DashboardSheltersDataResolver
  components/
    distribution-state/                # open/close distribution card + its 2 confirm dialogs
    registered-customers/               # customer count card + PDF customer-list download
    tickets-processed/                  # processed/total ticket count card
    recorded-food-collections/          # recorded/total food-collection count card
    recorded-route-names/               # names of routes fully recorded so far
    food-amount/                        # total recorded food weight (kg) card
    distribution-statistics-input/      # end-of-day form: employee count + shelter occupancy
    distribution-notes-input/           # free-text notes form for the distribution
    select-shelters/                    # multi-select shelter picker + its dialog, used by
                                         # distribution-statistics-input only
```

Every component under `components/` is a standalone, presentational-ish component using
`input()`/`output()`/`computed()`/`linkedSignal()`/`effect()` — none use NgModules, `@Input`, or
`ngOnInit`. Only `DashboardComponent` itself deals with the SSE stream; everything else is either
pure presentation (`FoodAmountComponent`, `TicketsProcessedComponent`) or talks to
`DistributionApiService`/`GlobalStateService` for actions and shared state.

### `resolver/`

`DashboardSheltersDataResolver` (registered in `dashboard.routes.ts`) pre-fetches the active
shelter list via `ShelterApiService.getActiveShelters()` before the route activates, so
`sheltersData` is available as a route-resolved `input()` on `DashboardComponent` immediately —
no loading spinner needed for the shelter picker used by `distribution-statistics-input`.

## Notable component details

- **`DistributionStateComponent`**: the only component that *writes* distribution state
  (`createNewDistribution()` / `closeDistribution()` via `DistributionApiService`). Closing shows
  a confirmation dialog first (`CloseDistributionDialogComponent`); if the backend returns
  validation errors/warnings, a second dialog (`CloseDistributionValidationDialogComponent`)
  lets the user force-close anyway.
- **`DistributionStatisticsInputComponent`**: reconciles three signal sources — the SSE-pushed
  `employeeCountInput`/`initialSelectedShelterNames` (from `DashboardData.statistics`), the
  resolver-provided `sheltersData`, and locally-typed form state — using a
  `initialIdsProcessed` guard flag so the SSE-provided initial shelter *names* (not IDs) are only
  applied to the form once, matched against `sheltersData()` by name.
- **`RegisteredCustomersComponent`**: the customer-list download button is only visible while a
  distribution is active (`*tafelIfDistributionActive`), and downloads a PDF by parsing the
  filename out of the `Content-Disposition` response header.
- Every panel card visually communicates "warning" vs "success" vs "primary" via `computed()`
  color functions comparing recorded vs. total counts (e.g. `TicketsProcessedComponent
  .panelColor`, `RecordedFoodCollectionsComponent.panelColor`) — no shared logic between them, so
  if you change the color rule, check both.

## Gotchas

- `DashboardComponent` calls `toSignal()` on the SSE observable **without an `initialValue`**, so
  `data()` is `undefined` until the first message arrives — every template binding that reads
  `data()?.foo` must handle that. Most child inputs accept `undefined` directly; the ones typed
  `input<number | null>(null)` (`tafel-recorded-food-collections`, `tafel-food-amount`,
  `tafel-tickets-processed`) render their "-" placeholder only on an explicit `null`, so they need
  the `?? null` seen in `dashboard.component.html` - passing bare `undefined` silently breaks their
  `!== null` template check.
- Don't add a new "is a distribution active" flag scoped to this module — always go through
  `GlobalStateService.getCurrentDistribution()` so `checkin`/`logistics`/other modules stay in
  sync with the same `/sse/distributions` stream.
- `distribution-statistics-input` and `distribution-notes-input` both reset their own local state
  via an `effect()` keyed off `GlobalStateService`'s distribution signal — if you add a new input
  field to the end-of-day form, remember to also reset it in `distributionEffect`.
