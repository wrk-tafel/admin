# Statistics Module

This module ("Statistiken" in the nav) is the historical/aggregate reporting area — as opposed to
the `dashboard` module's live, per-distribution cockpit. The nav item is a parent with two
sub-pages:

- **Allgemein** (`/statistiken/allgemein`) — pick a date range (or a specific past distribution,
  or "current month", or a whole year), fetch aggregated counters for that range from the
  backend, render them as small Chart.js line charts, and offer a CSV export of the same range.
- **Sonstige** (`/statistiken/sonstige`) — one-off reports that don't fit the date-range shape
  above; currently just the "Schulstartpakete" (school starter package) report, a
  min/max-age-filtered household member listing with its own CSV export.

It is unrelated to the `dashboard` module's "statistics" input card (`distribution-statistics-input`,
which records *today's* employee count / shelter occupancy for the currently open distribution).
The **Allgemein** page reports on *closed* distributions over arbitrary time ranges — see
"Relationship to the dashboard module" below.

## Folder structure

```
statistics/
  statistics.routes.ts                         # 'allgemein' + 'sonstige' child routes (redirects '' -> 'allgemein')
  views/
    general/
      statistics-general.component.ts / .html / .spec.ts  # date-range picker + CSV export + panels
    misc/
      statistics-misc.component.ts / .html / .spec.ts      # school starter package report + CSV export
  resolver/
    statistics-settings-resolver.component.ts  # StatisticsSettingsResolver -> StatisticsSettings (Allgemein only)
  components/
    statistics-panel.component.ts / .html / .spec.ts  # one Chart.js line-chart "tile" (used by Allgemein)
```

The two pages are deliberately separate components/routes, not tabs inside one component - they
have unrelated data shapes and lifecycles (date-range-driven charts vs. a fixed report), and the
nav renders them as `Statistiken > Allgemein / Sonstige` sub-items (see `navigation-menuItems.ts`).

## Allgemein: how the date range drives data

`StatisticsGeneralComponent` keeps the range as two signals, `_dateRangeFrom` / `_dateRangeTo`,
exposed as a combined `computed()` called `dateRange`. Four mutually exclusive input modes
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

Each of the nine tiles rendered in `statistics-general.component.html` is one
`<tafel-statistics-panel [data]="...">`, wrapping a single `ng2-charts` `<canvas baseChart>` line
chart. `StatisticsPanelComponent` just reshapes the incoming `StatisticsDetailData` (`title`,
`subTitle`, `labels`, `dataPoints`) into the Chart.js `data`/`options` shape via a `computed()`
(`chartData`), and applies one fixed, shared `optionsDefault` object: no axes, no legend, no
gridlines — these are meant to read as compact sparklines with a big number/title overlaid via
plain HTML (`data()?.title` / `data()?.subTitle`), not as analytical charts with tickable axes.
`ng2-charts`' `provideCharts(withDefaultRegisterables())` is registered as a route-level provider
on the `allgemein` route in `statistics.routes.ts` rather than app-wide, so Chart.js is only pulled
in when that route is actually navigated to.

`StatisticsGeneralComponent`'s template feeds all nine `StatisticsData` fields from the
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
past-distribution date ranges) before the `allgemein` route activates, so
`StatisticsGeneralComponent.settings` is populated as a route-resolved `input()` before first
render — used to populate the year dropdown (`yearOptions`, deduplicated + sorted descending,
always includes the current year even if the backend hasn't recorded it yet) and the distribution
dropdown. `sonstige` has no resolver — `StatisticsMiscComponent` has no settings dependency, it
just fetches its report data directly.

## Sonstige: `StatisticsMiscComponent`

Unlike `Allgemein`'s reactive `toSignal`/`switchMap` pipeline, this page follows the imperative
load-on-demand pattern used by the app's other paginated lists (`UserSearchComponent`,
`CustomerDuplicatesComponent`, `customer-above-limit`, ...): a plain
`schoolStarterPackageData = signal<SchoolStarterPackageSearchResult | undefined>(undefined)`,
populated by an explicit `loadSchoolStarterPackageData(page?)` call rather than derived from an
observable of the filter state:

```ts
onAgeMinChange(value: number) {
  this.schoolStarterPackageAgeMin.set(value);
  this.loadSchoolStarterPackageData();
}

onPageChange(event: PageEvent) {
  this.loadSchoolStarterPackageData(event.pageIndex + 1);
}

private loadSchoolStarterPackageData(page?: number) {
  this.statisticsApiService.getSchoolStarterPackageData(
    this.schoolStarterPackageAgeMin(), this.schoolStarterPackageAgeMax(), page
  ).subscribe((response) => this.schoolStarterPackageData.set(response));
}
```

Two plain `<input type="number">` fields (`Alter von` / `Alter bis`, bound via
`[ngModel]`/`(ngModelChange)`, no reactive form) each reload page 1 on change; the CSV export
button reuses the current age range but ignores paging - it always exports every matching row, not
just the current page. `ageMin`/`ageMax` are required query params on the backend
(`StatisticsController`/`StatisticsService`, `/api/statistics` — not a separate `reporting` module
path), matching the ad-hoc SQL this report replaced (`_reporting/reporting.sql`,
"Alter konfigurierbar").

Pagination itself mirrors `HouseholdService.getHouseholdsAboveLimit()` on the backend: the age
filter can't be expressed as a JPA `Pageable` query (it depends on each person's computed age, not
a stored column), so `StatisticsService.getSchoolStarterPackageData()` loads every matching entry
first and then slices it in-memory with a `PageRequest`/`PageImpl`, returning the same
`items`/`totalCount`/`currentPage`/`totalPages`/`pageSize` shape (`SchoolStarterPackageSearchResult`)
as `HouseholdSearchResult`/`UserSearchResult`. The template mirrors the same double-paginator
layout too (`mat-paginator` above and below the table, `[hidePageSize]="true"`, an
`@if (...items?.length === 0)` empty-state check) - see `user-search.component.html` or
`customer-duplicates.component.html` for the reference layout this was copied from.

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
- `statistics` module (this one) = historical/one-off *reporting*, fetched via plain HTTP,
  visualized as Chart.js line charts (Allgemein) or a plain table (Sonstige), exportable as CSV.

If you're looking for where an "average shelter occupancy over the last quarter" type feature
would go, it belongs in Allgemein, not `dashboard`. A new one-off report with its own filter
shape belongs in Sonstige, as its own card/section in `statistics-misc.component.html` (or a new
view alongside it, if it grows enough to warrant its own page).

## Gotchas

- `dateRangeFrom`/`dateRangeTo` getters/setters on `StatisticsGeneralComponent` exist only to
  bridge the `Date`-typed signals to the `<input type="date">` two-way `[(ngModel)]` binding
  (which needs `'YYYY-MM-DD'` strings) — don't replace the signals themselves with strings, the
  `dateRange` `computed()` and the API calls expect `Date` objects.
- Switching to `'custom'` mode doesn't reset `_dateRangeFrom`/`_dateRangeTo` — it keeps whatever
  the previous mode left behind, so the date inputs start prefilled with the last active range.
- `statisticsData()` is `undefined` until the first response arrives; the results card
  (`@if (statisticsData())`) is entirely absent from the DOM until then — there's no loading
  spinner, so a slow `/statistics/data` response just shows nothing below the range picker. Same
  applies to `schoolStarterPackageData()` on the Sonstige page.
- The nav item "Statistiken" has no `url` of its own anymore (see `navigation-menuItems.ts`) — it
  only renders as an expandable group with the two children, matching the existing
  `Benutzer`/`Einstellungen` pattern. Navigating straight to `/statistiken` still works via the
  `redirectTo: 'allgemein'` route.
