# Statistics Module

This module ("Statistiken" in the nav, route `statistiken`) is the historical/aggregate
reporting screen — as opposed to the `dashboard` module's live, per-distribution cockpit. It lets
staff pick a date range (or a specific past distribution, or "current month", or a whole year),
fetches aggregated counters for that range from the backend, renders them as small Chart.js line
charts, and offers a CSV export of the same range.

It is unrelated to the `dashboard` module's "statistics" input card (`distribution-statistics-input`,
which records *today's* employee count / shelter occupancy for the currently open distribution).
This module reports on *closed* distributions over arbitrary time ranges — see "Relationship to
the dashboard module" below.

## Folder structure

```
statistics/
  statistics.component.ts / .html / .spec.ts   # page: date-range picker + CSV export + panels
  statistics.routes.ts                         # single '' route, provides ng2-charts + resolver
  resolver/
    statistics-settings-resolver.component.ts  # StatisticsSettingsResolver -> StatisticsSettings
  components/
    statistics-panel.component.ts / .html / .spec.ts  # one Chart.js line-chart "tile"
```

Only 6 source files (+ specs) — there is no `components/` subfolder split beyond the single
reusable panel, since `StatisticsComponent` itself is the only page-level view.

## How the date range drives data

`StatisticsComponent` keeps the range as two signals, `_dateRangeFrom` / `_dateRangeTo`, exposed
as a combined `computed()` called `dateRange`. Four mutually exclusive input modes
(`year` / `currentMonth` / `distribution` / `custom`, a `mat-button-toggle-group` in the template)
all funnel into setting those two signals — e.g. picking a year computes Jan 1–now (current year)
or Jan 1–Dec 31 (past year) via `dayjs`; picking a past distribution copies its
`startDate`/`endDate` straight from `StatisticsSettings.distributions` (supplied by the resolver).

The actual data fetch is reactive, not imperative — no manual `.subscribe()` call on range change:

```ts
statisticsData = toSignal(
  toObservable(this.dateRange).pipe(
    switchMap(range => this.statisticsApiService.getData(range.from, range.to))
  )
);
```

`toObservable(this.dateRange)` re-emits whenever any of the mode-switching methods above updates
`_dateRangeFrom`/`_dateRangeTo`, `switchMap` cancels any in-flight request for the previous range,
and `toSignal()` turns the result back into a signal the template reads directly with
`statisticsData()`. There is no SSE involved anywhere in this module — everything here is a plain
resolved HTTP `GET` (`/statistics/data`, `/statistics/settings`, `/statistics/generate-csv`), since
it reports on data that has already settled (past or closing distributions), unlike `dashboard`'s
live counters.

## Charts: `StatisticsPanelComponent`

Each of the nine tiles rendered in `statistics.component.html` (see below) is one
`<tafel-statistics-panel [data]="...">`, wrapping a single `ng2-charts` `<canvas baseChart>` line
chart. `StatisticsPanelComponent` just reshapes the incoming `StatisticsDetailData` (`title`,
`subTitle`, `labels`, `dataPoints`) into the Chart.js `data`/`options` shape via a `computed()`
(`chartData`), and applies one fixed, shared `optionsDefault` object: no axes, no legend, no
gridlines — these are meant to read as compact sparklines with a big number/title overlaid via
plain HTML (`data()?.title` / `data()?.subTitle`), not as analytical charts with tickable axes.
`ng2-charts`' `provideCharts(withDefaultRegisterables())` is registered as a route-level provider
in `statistics.routes.ts` rather than app-wide, so Chart.js is only pulled in when this route is
actually navigated to.

`StatisticsComponent`'s template feeds all nine `StatisticsData` fields from the
`/statistics/data` response into panels, grouped under three headings:

- **Kunden und Personen** (customers/persons): `beneficiaryCustomers`, `beneficiaryPersons`,
  `beneficiaryCustomersWithChildren`
- **Notschlafstellen** (shelters): `sheltersCount`, `sheltersAverage`, `sheltersPersonsCount`
- **Transport- / Logistik**: `shopsCount`, `shopItemsTotal`, `shopItemsAverage`

All nine are typed in `app/api/statistics-api.service.ts` as `StatisticsDetailData` — the same
shape for every panel (`title`/`subTitle`/`labels`/`dataPoints`), so adding a tenth metric on the
backend just means adding one more field to `StatisticsData` and one more
`<tafel-statistics-panel>` in the template; `StatisticsPanelComponent` needs no changes.

## `resolver/`

`StatisticsSettingsResolver` pre-fetches `/statistics/settings` (available years +
past-distribution date ranges) before the route activates, so `StatisticsComponent.settings` is
populated as a route-resolved `input()` before first render — used to populate the year dropdown
(`yearOptions`, deduplicated + sorted descending, always includes the current year even if the
backend hasn't recorded it yet) and the distribution dropdown.

## Relationship to the dashboard module

There are **no cross-imports** between `modules/dashboard` and `modules/statistics` — confirmed:
neither module's components, services, or routes reference the other. They're loaded as fully
independent lazy routes in `app.routes.ts` (`uebersicht` vs `statistiken`), gated by different
permissions (`anyPermission: true` for dashboard, `anyPermissionOf: ['STATISTICS']` here), and
talk to entirely different backend API surfaces (`DistributionApiService`/`ShelterApiService` for
dashboard vs. `StatisticsApiService` here). The naming overlap is coincidental:

- `dashboard`'s "statistics" (`distribution-statistics-input`) = data *entry* for the
  **currently open** distribution (employee count, shelter occupancy), pushed live via
  `/sse/dashboard`.
- `statistics` module (this one) = historical *reporting* across arbitrary/past date ranges,
  fetched via plain HTTP, visualized as Chart.js line charts, exportable as CSV.

If you're looking for where an "average shelter occupancy over the last quarter" type feature
would go, it belongs here, not in `dashboard`.

## Gotchas

- `dateRangeFrom`/`dateRangeTo` getters/setters on `StatisticsComponent` exist only to bridge the
  `Date`-typed signals to the `<input type="date">` two-way `[(ngModel)]` binding (which needs
  `'YYYY-MM-DD'` strings) — don't replace the signals themselves with strings, the `dateRange`
  `computed()` and the API calls expect `Date` objects.
- Switching to `'custom'` mode doesn't reset `_dateRangeFrom`/`_dateRangeTo` — it keeps whatever
  the previous mode left behind, so the date inputs start prefilled with the last active range.
- `statisticsData()` is `undefined` until the first response arrives; the results card
  (`@if (statisticsData())`) is entirely absent from the DOM until then — there's no loading
  spinner, so a slow `/statistics/data` response just shows nothing below the range picker.
