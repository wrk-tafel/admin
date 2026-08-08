# ADR-0020: Reports and statistics are frozen snapshots, never live joins

**Status:** accepted · **Recorded:** 2026-08-09

## Context

Closing a distribution produces records that are sent out and filed: a daily report PDF, a set of
CSV exports, and the statistics that later feed the charts and year-to-date tables.

Those records describe a specific afternoon. Master data, however, keeps moving afterwards: shelters
are renamed or deleted, food categories are added, households are edited, merged or deleted, and
people have birthdays. If a report were assembled by joining live master data at render time, then
regenerating last March's report — which the manual mail re-send does — would produce a *different*
document than the one that was originally sent.

## Decision

**Everything a report needs is copied into the statistics record at close time, and reports read
only from that record.**

- `DistributionStatisticService` builds the `DistributionStatisticEntity` snapshot when the
  distribution closes: household/person/infant counts (new, prolonged, updated), average persons per
  household, and the logistics numbers (shops visited, food weight, route km).
- Shelter data is stored **by name**, in a snapshot list on the statistic, not as a reference to the
  live shelter — so renaming or deleting a shelter later cannot change a past report.
- Ages are computed against `distribution.startedAt`, never against the clock, so re-exporting an old
  distribution reproduces the age buckets it had rather than shifting everyone forward.
- Food weight is summed from the weights stored on the collected items, not recalculated from
  current category data.
- `DailyReportService` and the point-in-time exporters read the passed-in
  `DistributionStatisticEntity` and do not re-query for it.
- The rule is explicitly stated as reproducibility: every number in the snapshot must be derivable
  from the distribution alone.

## Consequences

- A report regenerated a year later is the report that was sent. That is the whole reason for the
  decision, and it is what makes the manual mail re-send safe to offer.
- Correcting data after a distribution has closed does **not** correct its report. The snapshot is
  the record; fixing it means an explicit new decision, not an automatic recompute. This is the trade
  and it must be understood before someone "fixes" a number by editing master data.
- Some data is stored twice — shelter names in statistics as well as in `shelters`. Deliberate
  denormalisation, and the reason a shelter name in a report may not match the current one.
- The snapshot is only as complete as what was copied. The point-in-time exporters read
  `currentStatistic.distribution.households` and silently report zeros if that relation is not
  populated on the entity handed to them — they do not re-query.
- Not everything is frozen, and the boundary matters: the two year-to-date exporters
  (`DailyReportsExporter`, `FoodCollectionsExporter`) *do* re-query every distribution of the current
  calendar year, and `FoodCollectionsExporter`'s column set comes from the *current* food categories.
  Adding a category changes the layout of future exports, not past ones. "All five exports cover the
  same range" is a wrong assumption.
- The live dashboard is the counterpart, not a contradiction: it rebuilds its snapshot from current
  data on every push, because it describes *now* rather than a closed event.

## Alternatives considered

**Compute reports from live data on demand.** Rejected: it makes historical documents mutable, and
any master-data edit silently rewrites the past. It would also make deleting a shelter or a household
destroy the reports that mentioned it.

**Keep references (foreign keys) into master data and rely on soft deletes.** Rejected: it turns
"never delete anything referenced by a report" into a permanent constraint on every master-data
screen, and a rename would still change the report.

**Store the finished PDFs/CSVs as blobs instead of the underlying numbers.** Rejected: the numbers
are also needed for the charts and year-to-date tables, so they must exist in queryable form; storing
the rendered files as well would add a second copy without removing the first.

## References

- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/modules/reporting/README.md`
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/modules/dashboard/README.md`
- `modules/distribution/internal/statistic/DistributionStatisticService.kt`
</content>
