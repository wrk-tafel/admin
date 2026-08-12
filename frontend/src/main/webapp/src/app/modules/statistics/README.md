# Statistics Module

This module ("Statistiken" in the nav) is the historical/aggregate reporting area — as opposed to
the `dashboard` module's live, per-distribution cockpit. The nav item is a parent with two
sub-pages:

- **Allgemein** (`/statistiken/allgemein`) — pick a date range (or a specific past distribution,
  or "current month", or a whole year, or the previous one), fetch aggregated counters for that
  range *and for the period before it* from the backend, render them as small Chart.js line charts
  with the delta between the two, and offer a CSV export of the same range.
- **Auswertung Kinder** (`/statistiken/auswertung-kinder`) — how many children of entitled
  households fall into an age range, with the split per age year, the matching list and a CSV
  export. Not date-range-driven like Allgemein: it is measured against an age range and a reference
  date. Ordering school starter packages is what it was first built for, but the same question is
  asked with other ages for other purposes, which is why nothing here is named after that one use.

It is unrelated to the `dashboard` module's "statistics" input card (`distribution-statistics-input`,
which records *today's* employee count / shelter occupancy for the currently open distribution).
The **Allgemein** page reports on *closed* distributions over arbitrary time ranges — see
"Relationship to the dashboard module" below.

## Folder structure

```
statistics/
  statistics.routes.ts                         # 'allgemein' + 'auswertung-kinder' child routes (redirects '' -> 'allgemein')
  views/
    general/
      statistics-general.component.ts / .html / .spec.ts  # date-range picker + CSV export + panels
    children/
      statistics-children.component.ts / .html / .scss / .spec.ts  # children report + age chart + CSV export
  resolver/
    statistics-settings-resolver.component.ts  # StatisticsSettingsResolver -> StatisticsSettings (Allgemein only)
  components/
    statistics-panel.component.ts / .html / .spec.ts  # one Chart.js line-chart "tile" (used by Allgemein)
    statistics-detail-dialog.component.ts / .html / .spec.ts  # a tile's course enlarged, with axes
    statistics-comparison.ts / .spec.ts        # what "the period before this one" is, and the delta to it
```

The two pages are deliberately separate components/routes, not tabs inside one component - they
have unrelated data shapes and lifecycles (date-range-driven charts vs. a fixed report), and the
nav renders them as `Statistiken > Allgemein / Auswertung Kinder` sub-items (see
`navigation-menuItems.ts`).

## Allgemein: how the date range drives data

`StatisticsGeneralComponent` keeps the range as two signals, `_dateRangeFrom` / `_dateRangeTo`,
exposed as a combined `computed()` called `dateRange`. Five mutually exclusive input modes
(`year` / `previousYear` / `currentMonth` / `distribution` / `custom`, a `mat-button-toggle-group`
in the template) all funnel into setting those two signals — e.g. picking a year computes Jan 1–now
(current year) or Jan 1–Dec 31 (past year) via `dayjs`; picking a past distribution copies its
`startDate`/`endDate` straight from `StatisticsSettings.distributions` (supplied by the resolver).
`previousYear` is the same whole-year range as picking last year from the dropdown, one click away,
because "how does this compare to last year" is the question the screen is opened for.

An incomplete or inverted range (a date input cleared mid-edit, "von 30.06. bis 01.01.") is not
sent: `dateRangeInvalid` blocks the request and the last valid answer stays on screen with a hint
beside the inputs — the backend would only answer an empty range with an error nobody can act on.

The actual data fetch is reactive, not imperative — no manual `.subscribe()` call on range change:

```ts
toObservable(computed(() => ({range: this.dateRange(), comparison: this.comparisonRange()})))
  .pipe(
    filter(() => !this.dateRangeInvalid()),
    tap(() => this.loading.set(true)),
    switchMap(query => this.loadData(query.range, query.comparison)),
    takeUntilDestroyed()
  )
  .subscribe(...);
```

The stream is keyed on the compared range as well as the shown one, not on the dates alone:
switching from `year` to `custom` can leave the dates untouched while changing what they are
measured against, and that has to refetch too. `switchMap` cancels any in-flight request for the
previous range. There is no SSE involved anywhere in this module — everything here is a plain
resolved HTTP `GET` (`/statistics/data`, `/statistics/settings`, `/statistics/generate-csv`), since
it reports on data that has already settled (past or closing distributions), unlike `dashboard`'s
live counters.

`appliedRange` (and `appliedComparisonRange`) is what every label on screen describes — the range
the numbers actually belong to. Reading the picker instead would relabel them the moment someone
changes it, before the matching response has arrived.

## Allgemein: the comparison

A number without a reference point is not an insight, so every key figure is shown together with
its delta against the equivalent period before it. What "equivalent" means is the mode's business
and lives in `components/statistics-comparison.ts` (`previousDateRange`, `COMPARISON_LABELS`):
a year against the year before, the running month against the same days of the month before, a
distribution against the distribution recorded before it, a custom range against the same number of
days directly in front of it. There is no second endpoint for this — `/statistics/data` is asked
twice with shifted dates, both requests fired at once via `forkJoin`.

Two consequences worth knowing:

- The comparison is allowed to fail on its own. A failing comparison request leaves the key figures
  themselves standing (they are what the screen is for); only a failing *current* request is
  reported as an error.
- Not every period has a predecessor — the oldest recorded distribution has none — and then the
  cards simply show no delta, with the summary line saying why.

The delta is computed from `StatisticsDetailData.value`, the plain number the backend sends
alongside the formatted `title`; `unit` is what a value formatted here (a min/max, a difference)
carries. Parsing the delta back out of `title` would mean undoing thousands separators and a unit
suffix again.

`distributionsInRange` counts the closed distributions the applied range covers, from the settings
the resolver already fetched. A range without any is called out explicitly: shelters and logistics
are recorded per distribution and stay zero then, while the customer counts still report the state
at the end of the range — ten empty cards otherwise read as a defect.

Whether the comparison is *worth* looking at depends on the data behind it, which is why the
`testdata` fixture carries three years of weekly distributions and a household base that grows and
lapses over the same window (`db-migration-testdata/testdata.sql`). Against a database that holds a
single distribution and households whose validity never ends, both periods answer the same number
and every card correctly reads "±0" over a flat line — which looks exactly like a broken screen.

## Allgemein: the period picker

The six periods, the control belonging to the picked one, and the CSV export share one block. From
`lg` up it is a two-column grid with the export in the block's bottom right corner, beside the
range it exports; below that it is a single column, so the export ends up where a form's confirming
button belongs — full width, under the numbers it covers. The toggle group wraps onto further lines
rather than scrolling sideways: a horizontal scrollbar hides periods behind an edge that nothing
announces. `tafel-button-toggle-group-wrap` (`scss/components/mat-button-toggle.scss`) is what makes
a wrapped group look like one control — Material styles a single line only.

`currentYear` and `previousYear` are the running year and the one before it in a single click and
need no control of their own; `year` is the same range for any other year and is the only one of the
three with a select beside it. Each period's own control is only as wide as its longest answer (a
year is four characters) from `sm` up; a field stretched across the card reads as if more were
expected, and on a phone there is nothing to stretch it against.

## Charts: `StatisticsPanelComponent`

Each of the ten tiles rendered in `statistics-general.component.html` is one
`<tafel-statistics-panel [data]="..." [comparison]="...">`, wrapping a single `ng2-charts`
`<canvas baseChart>` line chart. `StatisticsPanelComponent` reshapes the incoming
`StatisticsDetailData` (`title`, `subTitle`, `value`, `unit`, `labels`, `dataPoints`) into the
Chart.js `data`/`options` shape via a `computed()` (`chartData`), and applies one fixed, shared
`optionsDefault` object: no y axis, no legend — these read as compact sparklines with a big
number/title above them in plain HTML, not as analytical charts with tickable axes. The one axis
they keep is the x one: which stretch of time a point stands for, as a thin gridline per period with
its name under it. Which periods get named is `axisLabel`'s business — every one of them when they
fit (which is what shortening `2026-03` to `03` is for), otherwise as many as do, but always the
first and the last. What the line *also* offers on demand is its scale: the min/max/last values
written out beside it, tooltips
naming the value at the pointer's position, and the whole course with axes in an enlarged dialog
(`StatisticsDetailDialogComponent`) the card opens on click. The card's own keyboard path to that
dialog is the small button in its corner — the click on the card itself is a mouse convenience on
top of it, not a second tab stop. That dialog is opened with an explicit `width`/`maxWidth`: sized
by its content it comes out barely wider than the sparkline it was opened from on a phone, and
reading the course off the chart is the whole reason it exists.

While a period is loading, a panel renders a placeholder in place of its numbers rather than
keeping the previous period's on screen; the page announces the state once for all ten cards, so a
screen reader is not told about it ten times.

`ng2-charts`' `provideCharts(withDefaultRegisterables())` is registered as a route-level provider on
each chart-bearing route in `statistics.routes.ts` (`allgemein` and `auswertung-kinder`) rather than
app-wide, so Chart.js is only pulled in when such a route is actually navigated to. The
Auswertung Kinder bar chart doesn't go through `StatisticsPanelComponent`: it draws its own
`<canvas baseChart>` with visible axes, because there the split per age year *is* the information,
not a trend line behind a headline number.

`StatisticsGeneralComponent.panelGroups` maps all ten `StatisticsData` fields of the
`/statistics/data` response - together with the same fields of the compared period - onto the three
headings they are read under:

- **Kunden und Personen** (customers/persons): `beneficiaryCustomers`, `beneficiaryPersons`,
  `beneficiaryCustomersWithChildren`, `singleParentHouseholds`
- **Notschlafstellen** (shelters): `sheltersCount`, `sheltersAverage`, `sheltersPersonsCount`
- **Transport- / Logistik**: `shopsCount`, `shopItemsTotal`, `shopItemsAverage`

All ten are typed in `app/api/statistics-api.service.ts` as `StatisticsDetailData` — the same shape
for every panel — so adding an eleventh metric on the backend means one more field on
`StatisticsData` and one more key in `panelGroups`; neither the template nor
`StatisticsPanelComponent` needs changing.

## `resolver/`

`StatisticsSettingsResolver` pre-fetches `/statistics/settings` (available years +
past-distribution date ranges) before the `allgemein` route activates, so
`StatisticsGeneralComponent.settings` is populated as a route-resolved `input()` before first
render — used to populate the year dropdown (`yearOptions`, deduplicated + sorted descending,
always includes the current year even if the backend hasn't recorded it yet) and the distribution
dropdown. `auswertung-kinder` has no resolver — `StatisticsChildrenComponent` has no
settings dependency, it just fetches its report data directly.

## Auswertung Kinder: `StatisticsChildrenComponent`

The deliverable of this page is the **count** — how many children are in the chosen age range is
what gets acted on, so it leads as a large stat above the controls; the list below it is the
supporting evidence, and the export hint spells out that the CSV covers every match rather than the
page on screen.

Everything the page shows is measured against one `ChildrenFilter`
(`ageMin`/`ageMax`/`referenceDate`) that all three endpoints — list, per-age distribution, CSV —
are asked the same, or the headline, the chart and the export would answer different questions.
`referenceDate` ("Stichtag") is the day the age is measured on: what is planned from these numbers
is ordered weeks ahead, so a child turning six in August has to be countable in June. It only moves
the age math — household validity stays "entitled today" (see `StatisticsService.childrenFilter`).

The filter is a `FormGroup` with per-field bounds (0-120) plus a cross-field `ageRangeValidator`
(min <= max); `valueChanges` reloads page 1, and an invalid state simply doesn't fire a request —
which also covers the input a user has cleared mid-edit. `appliedFilter` is what the headline and
the export hint describe: reading the form itself would relabel the numbers the moment someone
types, before the matching response arrives. The backend rejects the same ranges
(`StatisticsService.validateAgeRange`), so the API is safe to call directly. The
`Schulalter 6–15` preset is a one-click way to the common case; the page still starts at 6-10.

Data loading stays imperative, unlike `Allgemein`'s reactive `toSignal`/`switchMap` pipeline —
the same load-on-demand pattern as the app's other paginated lists (`UserSearchComponent`,
`CustomerDuplicatesComponent`, `customer-above-limit`, ...):

```ts
private loadChildrenData(page?: number, pageSize?: number) {
  if (this.filterForm.invalid) {
    return;
  }

  const filter = this.currentFilter();
  this.appliedFilter.set(filter);

  this.statisticsApiService.getChildrenData(filter, page, pageSize)
    .subscribe((response) => this.childrenData.set(response));
  this.statisticsApiService.getChildrenAgeDistribution(filter)
    .subscribe((response) => this.ageDistribution.set(response));
}
```

The age distribution is its own endpoint rather than a field on the list response: the list is a
`PagedResponse<T>`, and the chart has to count the *whole* result set, not the current page. It
reports every age of the range including the empty ones, so the bar chart keeps its gaps instead of
silently closing them. The canvas carries the same split as its `aria-label` — a chart is invisible
to a screen reader otherwise.

Rows come back ordered by household, so a household sending more than one child appears as
consecutive rows: `rows()` marks the first of each with `firstOfHousehold`, which is what puts the
household number (a link to `/kunden/detail/:id` for users with `CUSTOMER`) on the group's first row
only and separates one household from the next. A household split across two pages simply starts a
new group on the following page.

`ageMin`/`ageMax` are required query params on the backend (`StatisticsController`/
`StatisticsService`, `/api/statistics` — not a separate `reporting` module path), matching the
ad-hoc SQL this report replaced (`_reporting/reporting.sql`, "Alter konfigurierbar").

Pagination happens at the DB level via a genuine JPA `Specification<PersonEntity>`/`Pageable` query
(`PersonRepository`, `PersonEntity.Specs`) - "age in [ageMin, ageMax]" is expressed as a plain
`birthDate` range rather than computed in the query (e.g. via Postgres' `age()`), so it's just an
ordinary indexable column comparison that Spring Data can paginate directly, no in-memory slicing
needed. `StatisticsService.getChildrenData()` returns the same
`items`/`totalCount`/`currentPage`/`totalPages`/`pageSize` shape (`ChildrenSearchResult`)
as `HouseholdSearchResult`/`UserSearchResult`, and the age-filtering math is covered end-to-end
against a real Postgres in `StatisticsServiceIT` (boundary ages, reference-date ages, main-person
exclusion, expired households, `totalCount` staying correct across pages, and the per-age counts) -
`StatisticsServiceTest` only unit-tests what the service does with whatever `PersonRepository` hands
back (mapping, page-number translation, range validation), since the actual filtering lives in the
Specification, not in Kotlin. The per-age distribution reads only the `birthDate` column of the
matches through the criteria API and counts the ages in memory: one query for the whole chart rather
than a `count(*)` per bar, and no entities loaded for rows nothing renders. The template mirrors the
same double-paginator layout as the rest of the app (`mat-paginator` above and below the table, an
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
  visualized as Chart.js charts (line sparklines in Allgemein, an age bar chart in
  Auswertung Kinder), exportable as CSV.

If you're looking for where an "average shelter occupancy over the last quarter" type feature
would go, it belongs in Allgemein, not `dashboard`. A new one-off report with a different filter
shape than the children report's age range does **not** belong on this page — give it its own view
and route alongside `children/`, rather than growing this one into a multi-report grab-bag.

## Gotchas

- `dateRangeFrom`/`dateRangeTo` getters/setters on `StatisticsGeneralComponent` exist only to
  bridge the `Date`-typed signals to the `<input type="date">` two-way `[(ngModel)]` binding
  (which needs `'YYYY-MM-DD'` strings) — don't replace the signals themselves with strings, the
  `dateRange` `computed()` and the API calls expect `Date` objects.
- Switching to `'custom'` mode doesn't reset `_dateRangeFrom`/`_dateRangeTo` — it keeps whatever
  the previous mode left behind, so the date inputs start prefilled with the last active range.
- `statisticsData()` is `undefined` until the first response arrives; the cards are rendered from
  the start regardless and show their loading placeholder until then. `childrenData()` on the
  Auswertung Kinder page has no such placeholder — a slow response there simply shows nothing yet.
- The nav item "Statistiken" has no `url` of its own anymore (see `navigation-menuItems.ts`) — it
  only renders as an expandable group with the two children, matching the existing
  `Benutzer`/`Einstellungen` pattern. Navigating straight to `/statistiken` still works via the
  `redirectTo: 'allgemein'` route.
