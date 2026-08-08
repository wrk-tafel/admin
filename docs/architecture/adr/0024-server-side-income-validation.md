# ADR-0024: Income validation always re-runs server-side, with explicit supervisor override

**Status:** accepted · **Recorded:** 2026-08-09

## Context

Eligibility is means-tested: a household's combined income is checked against a limit that depends on
how many adults and children it contains, plus configurable additions (family allowance, sibling
addition, child tax allowance) and a flat tolerance. The limits are maintained by administrators as
static values, not hard-coded.

Two things make this more than a form check. Staff need to see the result *while* entering data, so
the frontend asks for validation before submitting. And real cases exist that should be registered
despite failing the calculation — which means an override path is required, and an override path is
exactly where an unchecked client-side result becomes dangerous.

## Decision

**The client may ask for a validation result, but the server always computes it again on write, and
what happens on failure depends on the caller's role.**

- `IncomeValidatorService` reads its limits from `StaticValueRepository` per validation, so an
  administrator's change takes effect without a deploy.
- Domain rules live in the service: a person is a child under 15, but counts as a child for family
  allowance up to 24; persons flagged `excludeFromIncomeCalculation` are left out of the income sum
  but can still receive family allowance; the base limit is looked up per (adult count, child count)
  and a flat tolerance is added before comparing.
- The frontend calls `validate()` ad hoc before submit. `createHousehold`/`updateHousehold` then run
  the **same** validation again server-side — the client-computed result is never trusted.
- On failure, behaviour depends on the caller:
  - **Non-supervisor:** the household is saved, but with `validUntil` forced to yesterday — i.e.
    stored as already-invalid — and an `errorMsg` is returned.
  - **Supervisor without `force=true`:** rejected with `409 Conflict`, so the override is reviewed
    before it happens.
  - **Supervisor with `force=true`:** saved as-is, validity untouched.
- Households that end up over the limit surface in `GET /households/above-limit`, a review flow that
  loads valid households, evaluates each in memory and paginates the result — the criterion depends
  on the validator, not on a stored column, so it cannot be expressed in SQL.

## Consequences

- Eligibility rules exist in exactly one place and cannot be bypassed by a modified client. The
  frontend result is a preview.
- The rules are data, so limits are adjusted by administrators through the settings screens instead
  of by a release.
- **"Saved but invalid" is a real, intentional state.** A non-supervisor's failing household is
  recorded rather than lost — the record is worth keeping and the review happens later — but anyone
  reading `validUntil` must know that a date in the past can mean "failed validation", not only
  "expired".
- The three-way behaviour (save-invalid / 409 / force-save) is genuinely non-obvious and is the part
  of this area most likely to be misread when adding a caller.
- Validation runs twice per write. That is intended duplication, not waste.
- The above-limit review cannot be paginated in the database: it loads every valid household and
  evaluates in memory (with `persons` eagerly fetched to avoid N+1). It works at the current data
  volume and is the first thing that would need rethinking if that changed.
- A merge deliberately does not re-validate ([ADR-0022](0022-duplicate-detection-and-merge-by-side.md));
  the merged household lands in this same review flow instead.

## Alternatives considered

**Trust the client's validation result.** Rejected: it is the override path, and a client-asserted
"valid" would make eligibility a client-side decision.

**Validate only on the server, with no ad-hoc endpoint.** Rejected on usability: staff would only
learn a household is over the limit after submitting a long form.

**Reject failing households outright for everyone.** Rejected: the record has value even when the
calculation fails, and refusing the save pushes staff toward entering wrong numbers to get past the
check.

**Hard-code the limits.** Rejected: they change by decision of the organisation, not by release.

**Store an `aboveLimit` flag to make the review list a SQL filter.** Rejected: it would be a
derived value that goes stale whenever limits or household composition change, reintroducing the
double-source-of-truth problem this ADR avoids.

## References

- `modules/household/internal/income/IncomeValidatorService.kt` / `IncomeValidatorServiceImpl.kt`
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/modules/household/README.md` — "Income
  validation", "Supervisor/force gotcha"
- `modules/settings/` — static values / limits administration
</content>
