# Reporting Module

This module turns raw distribution/statistic data into files people actually consume: the per-distribution
daily report PDF that's emailed out, the set of CSV "TOeT" analysis exports emailed alongside it, and the
ad-hoc CSV/chart statistics export used by the settings/statistics screen in the frontend.

## Components

### Public API (root package `modules.reporting`)
- **`DailyReportService`** – Builds a `DailyReportPdfModel` from a `DistributionStatisticEntity` and renders
  it to PDF via `PDFService.generatePdf(pdfModel, "/pdf-templates/daily-report/dailyreport-document.xsl")`.
  Loads `assets/logo.png` for the header, formats the distribution's start/end time, and (notably) resolves
  shelter data straight off the passed-in `DistributionStatisticEntity.shelters` — filtering to shelters with
  `personsCount > 0` and sorting by `sortOrder` then `name` — not from a live `Shelter` lookup.
- **`StatisticExportService`** – Runs every registered `StatisticExporter` bean (Spring collects the
  `List<StatisticExporter>` automatically) against a `DistributionStatisticEntity`, turns each exporter's rows
  into a CSV byte array via `CsvUtil`, and returns them as a list of `StatisticExportFile(name, content)`.
- **`StatisticExportFile`** – Simple `(name, content: ByteArray)` DTO with a hand-written `equals`/`hashCode`
  (needed because `ByteArray` doesn't get structural equality for free from a data class).
- **`StatisticsController`** – `GET /api/statistics/*`, guarded by `@PreAuthorize("hasAuthority('STATISTICS')")`.
  Serves `/settings` (years + list of closed distributions available to pick from), `/data` (chart data for a
  date range), and `/generate-csv` (single combined CSV export for a date range). The frontend compares two
  periods by asking `/data` twice with shifted dates — there is no separate comparison endpoint, and none is
  needed: the previous period is the same question asked of another range. This is the API the
  frontend's **statistics** feature module (Chart.js panels) talks to — unrelated to the daily-report/CSV
  files emailed after closing a distribution.

### `internal/` (not visible to other modules)
- **`StatisticsService`** – Backs `StatisticsController`. Runs hand-written native SQL through
  `EntityManager.createNativeQuery`, using two Postgres helper functions that are *not* defined in this
  module (`get_timeline(fromDate, toDate)` and `format_by_resolution(date, res_code)` — search the Flyway
  migrations if you need to change bucketing/resolution behavior). Produces beneficiary
  household/person counts, shelter counts/averages, and shop/food totals, each as a labeled timeseries
  (`StatisticsResult`), then also flattens the latest data point into `/generate-csv`'s single-row CSV export.
  Which data point a key figure's headline is depends on what it measures, which is what the three
  `lastValueDetail`/`sumDetail`/`averageDetail` helpers stand for: a state at the end of the period (how many
  households were entitled), a total accumulated over it (kilograms collected), or the average per data point
  that actually happened. Each `StatisticsDetail` carries that headline twice — formatted as `title`, and as
  the plain `value`/`unit` the frontend computes its period-over-period delta from.
  Note the explicit `Locale.ROOT` formatting call in `executeStatsQuery` — deliberately avoids the JVM default
  `de-DE` locale (comma decimal separator) because the value round-trips through `String.toDouble()`, which
  is locale-independent and would throw on a comma-formatted string.
- **`DailyReportPdfModel`** / `DailyReportShelterPdfModel` – The XML-serializable model fed into FOP. Uses
  `@JsonRootName("data")` because the XSL-FO template's root match is `/data`. Hand-written `equals`/`hashCode`
  again because of the raw `logoBytes: ByteArray` field.
- **`internal/statisticexporter/`** – One `StatisticExporter` implementation per CSV file emailed after a
  distribution closes (see below).

### `internal/statisticexporter/` — the "TOeT" CSV exporters
Each implements the tiny `StatisticExporter` interface (`getName(): String`, `getRows(statistic): List<List<String>>`)
and is picked up automatically as a `@Component` — add a new one and `StatisticExportService` will include it
in the mailed export set without any other wiring change:

- **`AgeDistributionExporter`** (`TOeT_Verteilung_Alter`) – Buckets every household member into fixed age
  ranges (`AgeRange` enum, 0-20 … 91+) and reports household/person counts and percentages per bucket, for the
  *current* distribution only. Ages are taken as of `distribution.startedAt`, not as of the export run, so
  re-exporting an old distribution reproduces the buckets it had rather than shifting everyone forward.
- **`CountryDistributionExporter`** (`TOeT_Verteilung_Nationalitaeten`) – Same idea, grouped by
  `Person.country`, current distribution only.
- **`HouseholdSizeDistributionExporter`** (`TOeT_Verteilung_Haushaltsgroesse`) – Distribution of household
  sizes (1..10 persons), current distribution only.
- **`DailyReportsExporter`** (`TOeT_Tagesreports`) – The odd one out: pulls **every distribution of the
  current calendar year** via `distributionRepository.getDistributionsForYear(...)` and emits one row per
  past distribution plus a row for the current one, i.e. a running year-to-date table, not just a snapshot of
  today.
- **`FoodCollectionsExporter`** (`TOeT_Spenden`) – Also year-to-date (same `getDistributionsForYear` pattern).
  Builds one row per shop-per-food-collection-per-distribution, with one column per `FoodCategoryEntity`
  (sorted return-items-last, then by name), so the column set changes if food categories are added/removed in
  the `logistics` module.

Because `AgeDistributionExporter`/`CountryDistributionExporter`/`HouseholdSizeDistributionExporter` only look
at `currentStatistic.distribution.households`, they silently report empty/zero data if that relation isn't
populated on the entity passed in — they do not requery the database for it.

## Module dependency: `reporting` depends on `distribution`, only for one event

`reporting`'s `package-info.java`:

```java
@org.springframework.modulith.ApplicationModule(
        allowedDependencies = {"distribution"}
)
package at.wrk.tafel.admin.backend.modules.reporting;
```

This is the *reverse* of what you'd expect from "distribution closes, then reporting emails files" — and
it used to be reversed: `distribution` previously depended on `reporting` directly (two post-processors,
`DailyReportMailPostProcessor`/`StatisticMailPostProcessor`, called `DailyReportService`/
`StatisticExportService` straight from `distribution`). That coupling was inverted via an event: `distribution`
now publishes `at.wrk.tafel.admin.backend.modules.distribution.DistributionClosedEvent` (a public,
non-internal type) after a distribution closes, and `reporting` is the one with the allowed dependency —
solely so it can reference that event type.

There are no explicit `@NamedInterface`/`@org.springframework.modulith.NamedInterface` annotations anywhere
in this module. Spring Modulith's default rule applies instead: **a module's root package is its default
public API; everything under `internal` is hidden from other modules.** Concretely, the classes sitting
directly in `modules.reporting` (`DailyReportService`, `StatisticExportService`, `StatisticExportFile`,
`StatisticsController` and the `StatisticsSettingsResponse`/`StatisticsResponse`/... DTOs) are importable by other
modules; everything in `modules.reporting.internal.*` (the `StatisticsService`, the PDF model, the
exporters, and the listener below) is not. In practice nothing outside `reporting` imports
`DailyReportService`/`StatisticExportService`/`StatisticExportFile` anymore (checked) — they're only public
because nothing has moved them to `internal` since the post-processors that used to be their only external
callers were deleted.

### `internal.DistributionClosedEventListener` — reacts to `DistributionClosedEvent`

`@Component class DistributionClosedEventListener` is a plain, synchronous `@EventListener` (deliberately *not*
`@ApplicationModuleListener` — see its class doc for why) that reacts to `DistributionClosedEvent` by
calling `dailyReportService.generateDailyReportPdf(statistic)` and
`statisticExportService.exportStatisticFiles(statistic)` itself and emailing the results - the same two
mails `DailyReportMailPostProcessor`/`StatisticMailPostProcessor` used to send from inside `distribution`,
now sent from inside `reporting` instead - plus a third mail, the return-boxes summary, ported over
(unchanged logic) from `distribution`'s `ReturnBoxesMailPostProcessor`. That third one never actually
depended on `reporting`; it moved here purely so all three mails share the same isolation handling.

Each mail is composed in a transaction of its own and isolated from the other two, so one that fails
neither blocks the others from being attempted nor rolls back the rows they already queued - the three
go to three different recipient lists, so a broken CSV export must not also cost leadership its daily
report. Nothing is retried here: composing a mail renders a PDF/CSV and writes a `mail_outbox` row, and
neither gets better on a second identical attempt. The part that does fail transiently - handing the
mail to a mail server - is retried by `MailOutboxService`, long after this listener has returned. See
`distribution/README.md`'s "Why `distribution` no longer depends on `reporting`" section for the full
picture of both sides of this event, including the manual mail-resend path.

`ReportMailFailedEvent` therefore reports a mail that could not be **built**. A mail that could not be
**delivered** is reported by `MailOutboxService` itself, via `MailDeliveryFailedEvent`; both end up as
the same "E-Mail nicht versendet" push notification to administrators.

Every class in this codebase whose job is to react to a Spring event is named `<EventName>Listener` — this
one, and `distribution.internal.DistributionEndedEventListener` (reacts to `DistributionEndedEvent`, the
internal-only event that triggers `distribution`'s own post-processor chain before this one ever fires).

## PDF generation mechanics (XSL-FO + Apache FOP)

`DailyReportService` is the only class in this module that generates a PDF, and it delegates the actual
rendering to the shared `common.pdf.PDFService`:

1. `PDFService.generatePdf(data, stylesheetPath)` serializes `data` (here, `DailyReportPdfModel`) to XML using
   a Jackson `XmlMapper` — this is why the model is annotated `@JsonRootName("data")`, matching the XSL
   template's expected root element.
2. It runs that XML through an XSLT `Transformer` using the stylesheet at `stylesheetPath` — for daily
   reports that's `backend/src/main/resources/pdf-templates/daily-report/dailyreport-document.xsl` (plus
   whatever it `<xsl:include>`s from the sibling `pdf-templates/daily-report/includes/` folder; a custom
   `ClasspathResourceURIResolver` lets those includes resolve as classpath resources).
3. The XSLT output is XSL-FO, which `fopFactory.newFop(MimeConstants.MIME_PDF, ...)` (Apache FOP) renders
   directly to PDF bytes. Fonts (Liberation Sans family) are extracted from the classpath to a temp directory
   at factory-build time because FOP needs real filesystem paths, not classpath streams, for font
   registration.

If you need to change the daily report's layout, edit the XSL (and its includes) — the Kotlin side only needs
to change if you're adding/removing *data* on `DailyReportPdfModel`/`DailyReportShelterPdfModel`, since the
XML shape is derived straight from that data class's field names via Jackson.

## CSV mechanics

CSV generation goes through the shared `common.csv.CsvUtil.writeRowsToByteArray(rows: List<List<String>>)`,
which uses Apache Commons CSV with `;` as the delimiter (not the default `,` — matches Austrian/German Excel
locale expectations) and UTF-8 encoding. Every exporter in `statisticexporter/` and
`StatisticsService.generateCsv()` build a plain `List<List<String>>` (including header rows mixed into the
same list) and hand it to this one utility — there's no shared "CSV row builder" abstraction beyond that.

## Gotchas

- Three of the five `StatisticExporter`s (`AgeDistributionExporter`, `CountryDistributionExporter`,
  `HouseholdSizeDistributionExporter`) are *point-in-time* (current distribution only); the other two
  (`DailyReportsExporter`, `FoodCollectionsExporter`) are *year-to-date* and re-query the DB for every prior
  distribution in the current calendar year via `DistributionRepository.getDistributionsForYear(...)`. Don't
  assume all five exports cover the same time range.
- `/api/statistics/*` (frontend "statistics" charts/CSV) and the CSV files emailed by
  `StatisticMailPostProcessor` are two entirely separate code paths (`StatisticsService` vs. the
  `statisticexporter/*` classes) that happen to both live in `reporting` — they use different SQL, different
  row shapes, and different filenames. Don't conflate "the CSV export" as if there's only one.
- Shelter data in the daily report PDF is a historical snapshot on `DistributionStatisticEntity`, not a live
  join to `logistics`' `Shelter` entity — same reasoning as in the `dashboard` module's README: renaming or
  deleting a shelter later must not change past PDFs/exports.
- `FoodCollectionsExporter`'s CSV column set is derived from *current* `FoodCategoryEntity` rows at export
  time, sorted return-items-last then by name — adding/renaming a food category in `logistics` changes the
  column layout of future exports (but not past ones, since those were already generated and mailed).
