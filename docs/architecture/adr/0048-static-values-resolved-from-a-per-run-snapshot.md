# ADR-0048: Static values resolved from a per-run snapshot instead of a cache

**Status:** accepted · **Recorded:** 2026-08-11

## Context

`static_values` holds the numbers income validation runs on: the limit per household composition,
the family allowance tiers, the Kinderabsetzbetrag, the Geschwisterstaffel and the tolerance. They
are maintained by administrators in the settings UI and adjusted a few times a year, when the
reference rates change.

Reading them was expensive in the small: `IncomeValidatorServiceImpl` asked the database one scalar
question at a time — around four queries per validation, plus two more per child — and
`HouseholdService.getHouseholdsAboveLimit()` re-validates *every* valid household on one page view.
The answer to that was `@Cacheable` on the repository's query methods, backed by an in-process
`ConcurrentMapCacheManager`, with `SettingsService.updateStaticValue()` evicting all of it on a
write.

That works for exactly one instance. Run two, and the eviction happens on the instance that handled
the edit while the other keeps validating households against the old limit until it is restarted —
no log line, no error, just the wrong eligibility answer for real customers on some fraction of
requests. It was the most user-visible of the multi-instance blockers reviewed in
[#3188](https://github.com/wrk-tafel/admin/issues/3188), and the least visible in symptoms.

Two smaller inconsistencies sat in the same code and would have survived any cross-instance
invalidation: an edit landing mid-run left `getHouseholdsAboveLimit()` reporting a set validated
partly against the old and partly against the new limit, and seven separate `LocalDate.now()` calls
per validation meant a validation crossing midnight resolved its lookups against two dates.

## Decision

**There is no cache. A validation run reads the values in effect on its date once and resolves every
lookup against that snapshot in memory.**

- `StaticValueRepository.findAllValidAt(date)` returns the rows whose `[validFrom, validTo]` window
  covers the date — a few dozen, about 2 KB.
- `IncomeRateCard` (`modules/household/internal/income/IncomeRateCard.kt`) is that snapshot as a
  value object: it carries the `referenceDate` it was resolved for and answers every lookup the
  arithmetic needs. A lookup with no matching row answers zero, as the individual queries did.
- `IncomeValidatorServiceImpl.validate(persons)` resolves one card and validates against it;
  `validateAll(personsPerHousehold)` resolves one card for the whole batch, which is what
  `getHouseholdsAboveLimit()` uses. The arithmetic is a pure function of the persons and the card,
  including the age brackets, which are measured against `referenceDate` rather than "now".
- `CacheConfig`, the `@Cacheable` annotations and the `@CacheEvict` are gone. Nothing in the
  codebase caches anything any more.

`validFrom`/`validTo` on every row means this table already *is* a versioned rate card; "the values
in effect on date D" is a domain concept the code did not have, and the cache was a workaround for
its absence.

## Consequences

- **Zero staleness rather than bounded staleness.** Every instance sees an edit on its next
  validation. There is no invalidation path that can silently stop working, and nothing new to
  operate, monitor or document.
- **A run is internally consistent.** Every household in one `getHouseholdsAboveLimit()` result was
  measured against the same limits, and a single validation resolves against a single date.
- **Cheaper on the common path.** A customer create/edit validation is one query instead of four to
  fourteen. The one regression is `getHouseholdsAboveLimit()`, which now pays one extra 30-row read
  per page view compared to a warm cache — next to the N household loads that dominate that
  endpoint, and next to the fact that it re-validates every household per page view anyway
  ([#3198](https://github.com/wrk-tafel/admin/issues/3198)).
- **The snapshot is per run, not per request.** Two validations in the same request each read the
  table; that is one round trip each and deliberately not optimised into a request-scoped bean,
  which would be a cache with a shorter name.
- **A new consumer of `static_values` has to decide for itself.** `MissingCostContributionService`
  still reads its one value through `findSingleValueOfType` — a single lookup does not need a card.
  What must not come back is a cache in front of either.

## Alternatives considered

- **Broadcast the eviction over the existing `sse_outbox` / `LISTEN` channel.** Works, and a trigger
  on `static_values` would beat evicting from `SettingsService` — it would cover a correction made
  directly in SQL, and `pg_notify` is transactional, so a rolled-back edit broadcasts nothing. But
  it keeps the cache and its staleness window whenever the listener's connection is down, and adds a
  coherency path whose only user is this one cache.
- **Version stamp / validate-on-read** — a `static_values_version` row bumped by a trigger and
  checked once per validation run. Exact, and independent of `LISTEN`/`NOTIFY` being alive, but it
  is a hand-rolled coherency protocol that costs the same one query per run the snapshot costs. Note
  a watermark cannot be built from the existing columns: `static_values` has no
  `created_at`/`updated_at` (dropped by `R__00056`), and `updateStaticValue` updates in place for a
  same-day edit, so `max(id)` does not move either.
- **A TTL cache** (Caffeine, expire-after-write). Buys bounded staleness; exactness is free here, so
  paying anything for approximate is a bad trade.
- **A replicated cache** (Hazelcast/Infinispan embedded). The tidiest fix for the bug exactly as
  stated — `@Cacheable` stays and replication handles the eviction — at the price of cluster
  discovery, membership, split-brain semantics and a new class of startup failure, for 27 rows.
  Nothing else in the codebase would use it.
- **An external cache** (Redis/Valkey). A network hop to fetch 2 KB that still needs write-side
  invalidation, plus a component that can be down — raising a question nobody wants live: does
  eligibility validation then fail closed or serve stale limits? It also contradicts
  [ADR-0003](0003-postgresql-as-the-only-infrastructure-dependency.md).
- **Hibernate second-level cache.** Superficially the natural fit for read-mostly reference data, and
  its invalidation is automatic. Rejected because it does not actually fix this: all lookups here are
  JPQL, so it needs the query cache plus the entity cache, and with the default local region factory
  both stay per JVM — instance B remains stale exactly as before unless a clustered region factory is
  added, i.e. the replicated cache above with more parts. Enabling L2 is also persistence-unit-wide,
  and this codebase deliberately writes around Hibernate in places (the retention cleanups, the mail
  poller, `HouseholdMergeService`'s bulk re-parenting), each of which would have to declare its
  synchronized table spaces or become a stale-read footgun in modules unrelated to static values.
- **Moving the rate card into the hot-reloading `config.yml`.** Every instance re-reads its own file,
  so coherency is free and caching never arises. Rejected because it destroys the settings UI (admins
  currently change limits without a deploy) and the `validFrom`/`validTo` historization, which is
  domain data past distributions are reasoned about with.

## References

- [#3190](https://github.com/wrk-tafel/admin/issues/3190) (this decision),
  [#3188](https://github.com/wrk-tafel/admin/issues/3188) (the multi-instance review it came from)
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/modules/household/internal/income/`
  (`IncomeRateCard`, `IncomeValidatorServiceImpl`)
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/database/model/staticdata/StaticValueRepository.kt`
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/modules/settings/internal/SettingsService.kt`,
  `modules/settings/README.md`
- [ADR-0003](0003-postgresql-as-the-only-infrastructure-dependency.md) — PostgreSQL is the only
  infrastructure dependency, which is also why no cache server was on the table
