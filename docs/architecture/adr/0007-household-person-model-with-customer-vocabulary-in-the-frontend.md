# ADR-0007: Household/person domain model, "customer" vocabulary kept in the frontend

**Status:** accepted · **Recorded:** 2026-08-09

## Context

What the organisation registers is not an individual — it is a household: an address, a business
number, a validity period, a combined income, and the people who live there. The original schema
modelled it as one `customers` row (the main person's name and the household's address on the same
row) plus `customers_addpersons` for everyone else. That shape makes the main person structurally
different from every other household member, so anything true of "a person" had to be implemented
twice, and moving a person between households was not expressible at all.

Correcting this touches the most-used part of the system. The frontend's entire customer area —
routes (`/kunden/...`), components, resolvers, tests, and the German UI vocabulary staff use daily
("Kunde") — was built against the flat shape.

## Decision

**The persistence and API model is `households` + `persons`. The frontend keeps its `customer`
vocabulary, and exactly one file translates between the two.**

- A **household** (`households`) is the case record: business number, address, contact data,
  `valid_until`, lock state, pending cost contribution, issuing employee.
- A **person** (`persons`) is any household member, including the main one, flagged by
  `is_main_person`. Exactly one per household, enforced by the partial unique index
  `uq_persons_household_main`.
- `households.main_person_id` is **nullable at the DB level**, because household and person
  reference each other and neither row can be inserted first. `HouseholdService.saveWithMainPerson`
  owns the resulting two-phase save; `deleteHouseholdByHouseholdId` owns its mirror image on delete.
- The REST resource is `/api/households`.
- On the frontend, the feature module stays `customer`, and `CustomerData` /
  `CustomerAddPersonData` keep the flat "customer + additionalPersons" shape. Only
  `customer-api.service.ts` knows about households and persons: it flattens the main person onto the
  customer object on read, and splits it back out on write.
- The old `customers` / `customers_addpersons` tables remain in place, read-only and unused, for a
  production observation window; a separate cleanup migration drops them
  ([ADR-0004](0004-repeatable-only-flyway-migrations.md) is why that is a new migration rather than
  an edit).

## Consequences

- One uniform representation of a person. Duplicate detection, merging, income validation and
  household statistics all operate on `persons` without a special case for the main one, and a
  person can be re-parented to another household — which is what makes a real merge
  (`HouseholdMergeService`) possible instead of a delete.
- **`household` and `customer` mean the same thing in this codebase, depending on which layer you
  are in.** That is the accepted price of not rewriting a working, heavily used frontend area; it is
  documented in `CLAUDE.md`, the module README and here, because it is genuinely confusing on first
  contact. Residual traces of the old naming exist where a rename would carry risk without benefit —
  for example the PDF templates under `pdf-templates/customer-pdf/`.
- The translation is a single choke point. It is also a single point of failure: a change to the
  household API that skips `customer-api.service.ts` will not reach any other frontend file.
- The nullable `main_person_id` is a schema-level concession to the mutual reference. Any code path
  that persists a `HouseholdEntity` outside `HouseholdService` must reproduce the two-phase save or
  it hits a foreign-key violation — or worse, leaves `main_person_id` null.
- `HouseholdConverter.mapHouseholdToEntity` relies on `orphanRemoval` over the complete persons
  list, so feeding it a partial list deletes people. Merging therefore re-parents rows with explicit
  bulk updates instead of going through the converter.
- The legacy tables still exist, so "the customer table" is an ambiguous phrase during the
  observation window. Nothing may read or write them.

## Alternatives considered

**Keep the flat `customers` shape and work around it.** Rejected: the asymmetry between the main
person and everyone else was the direct cause of the duplicated logic and made merging impossible.

**Rename the frontend to `household`/`person` as well.** The consistent option, and rejected on
risk: it would touch every route, component, resolver and test in the most-used feature area, and it
would change the German UI vocabulary staff have used for years, for zero user-visible benefit. If
it is ever done, it is its own task with its own e2e coverage, not a side effect of a data-model
change.

**Translate in every frontend file instead of one service.** Rejected: it spreads the wire contract
across the whole module and makes the next API change a module-wide edit.

**Drop the legacy tables in the same migration.** Rejected: the observation window is the safety net
for a data migration of the primary records, and it costs only unused disk.

## References

- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/modules/household/README.md`
- `backend/src/main/resources/db-migration/R__00067_household_person_refactor.sql`,
  `R__00068_household_person_cleanup.sql`
- `frontend/src/main/webapp/src/app/api/customer-api.service.ts`
- `CLAUDE.md` — backend/frontend module descriptions
</content>
