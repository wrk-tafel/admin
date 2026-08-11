# ADR-0049: The above-limit list is computed from live data, never materialized

**Status:** accepted · **Recorded:** 2026-08-11

## Context

`GET /households/above-limit` (`HouseholdService.getHouseholdsAboveLimit()`) lists the households
whose income exceeds the limit they are entitled to. "Above limit" is not a stored column: it is the
answer `IncomeValidatorService` gives for a household's persons against the static values in effect
today, so it cannot be expressed as a `where` clause (see [ADR-0024](0024-server-side-income-validation.md)).

The endpoint therefore loads every valid household, validates each one, and paginates the resulting
list in memory — which means a page view recomputes the entire result set, and paging through five
pages computes it five times. Two properties of the domain decide whether that matters and what may
be done about it:

- The inputs change constantly and from several directions. A person's income is edited in the
  customer screens, persons are added and removed, `validUntil` moves on every prolongation, and the
  limits themselves are administrator-editable static values — one edit there changes the answer for
  *every* household at once.
- The list is a review flow used by a handful of staff with the `CUSTOMERS_ABOVE_LIMIT` permission,
  not a screen the whole distribution day depends on.

A stale entry in this list is not a cosmetic defect: it is a household presented to staff as
ineligible when it is not, or missing from a review it belongs in.

## Decision

**The list stays computed from live data on every request. What is bounded is the work per run, not
how often it runs.**

- The filter is evaluated straight off the loaded `HouseholdEntity` instances —
  `mapEntityToValidationPersons` reads the birth date, income and the two flags, which is everything
  the validator needs.
- Only the requested page's households are mapped to a `HouseholdResponse`. That mapping resolves
  each household's issuer, its `lockedBy` user and every person's country, which the endpoint
  previously did for the whole set and then discarded for all but a page's worth.
- `HouseholdRepository.findAll(spec, sort)` fetches `persons` eagerly via `@EntityGraph`, so the run
  is one query rather than one per household. `HouseholdRepositoryIT` asserts that, because losing it
  changes nothing about the answer and everything about the cost.
- The whole run is measured against one rate card (`IncomeValidatorService.validateAll`,
  [ADR-0048](0048-static-values-resolved-from-a-per-run-snapshot.md)), so "live" means *live as of
  the request*, not re-read per household.

## Consequences

- The endpoint's answer is never stale and there is nothing to invalidate: an income corrected or a
  limit adjusted seconds ago is reflected by the next request, on every instance.
- The cost of a page view is one query plus arithmetic over every valid household, and page-size many
  response mappings. It still grows linearly with the number of valid households, so a data set an
  order of magnitude larger than today's would force this decision to be revisited — at which point
  the materialization below is the option to reach for, with its invalidation cost paid deliberately.
- `getHouseholdsAboveLimit` is now the only caller that validates without going through a
  `HouseholdResponse`, so there are two mappings into `IncomeValidatorPerson` — one from the DTOs and
  one from the entities — that must keep the same rules (notably: the main person is never excluded
  from the income sum and never contributes a family allowance).
- Pagination remains in-memory, so `totalCount` is exact and cheap, and no `Pageable` may be combined
  with the collection fetch join — Hibernate would paginate in memory over the whole result anyway.

## Alternatives considered

- **Persist the outcome** — an `above_limit` flag or table maintained when a household or a static
  value changes, turning the endpoint into a plain paged query. This is the only option that removes
  the per-request recomputation, and it is genuinely faster. It loses because of what maintaining it
  requires: a static-value edit invalidates every household's flag at once, so the write path is not
  "recompute the row that changed" but "recompute all of them", and every code path that touches a
  person or a household — including `HouseholdMergeService`'s bulk re-parenting, which bypasses
  Hibernate events — becomes a place that can silently leave the flag wrong. The failure mode is a
  wrong eligibility answer with nothing in the logs and no error — the same class of defect the
  stale static-value cache produced ([#3190](https://github.com/wrk-tafel/admin/issues/3190)).
- **Cache the computed list per request or for a short TTL.** A request-scoped result is recomputed
  per page view anyway — the client fetches one page per request — so it buys nothing. A TTL buys
  bounded staleness for a list whose whole purpose is to be checked against reality, and would be the
  only cache in the codebase.
- **A database view or a native query approximating the rule.** Would put the eligibility arithmetic
  in SQL alongside the Kotlin implementation, in a second dialect that has to agree with it — the
  duplication ADR-0024 exists to prevent.

## References

- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/modules/household/internal/HouseholdService.kt`
  (`getHouseholdsAboveLimit`)
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/database/model/household/HouseholdRepository.kt`
- `backend/src/test/kotlin/at/wrk/tafel/admin/backend/database/model/household/HouseholdRepositoryIT.kt`
- [ADR-0024](0024-server-side-income-validation.md) — income validation runs server-side, from data
- [ADR-0048](0048-static-values-resolved-from-a-per-run-snapshot.md) — one rate card per validation
  run, no cache in front of the static values
- [#3198](https://github.com/wrk-tafel/admin/issues/3198), split out of
  [#3190](https://github.com/wrk-tafel/admin/issues/3190)
