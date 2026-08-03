# Household Module

This module manages the "case record" for a Tafel customer: a household and the persons living in
it. It is the direct successor of the old `customer`/`customer_addpersons` model. The **business
package is still called `household`**, and the **frontend feature module is still called
`customer`** (only `customer-api.service.ts` on the frontend knows about the household/person
split) — don't be surprised to see `household` and `customer` used interchangeably across the
codebase depending on which layer you're in.

`@ApplicationModule(allowedDependencies = {"base::country", "base::exception"})` (see
[`package-info.java`](package-info.java)) - this module is only allowed to reach into the `country`
and `exception` named interfaces of the `base` module. It does **not** depend on `base::employee`
directly; instead it goes through `UserEntity.employee` (see below).

## Domain model

- A **household** (`households` table, [`HouseholdEntity`](../../database/model/household/HouseholdEntity.kt))
  is the case record: business number (`household_id`), address, contact data, validity
  (`valid_until`), lock state (`locked`/`lockedAt`/`lockedBy`/`lockReason`), cost-contribution state
  (`pending_cost_contribution`) and the issuing employee (`issuer`).
- A household has one or more **persons** (`persons` table,
  [`PersonEntity`](../../database/model/person/PersonEntity.kt)), exactly one of which is flagged as
  the **main person** via `is_main_person`. This is enforced in the database by a partial unique
  index: `uq_persons_household_main on persons (household_id) where is_main_person = true`.
- `households.main_person_id` points at that person's row, but every household member also has
  `person.household_id` pointing back at the household. The API-facing `Household`/`Person` models
  (in [`HouseholdResponseModel.kt`](HouseholdResponseModel.kt)) expose `persons: List<Person>` with
  `mainPerson()`/`additionalPersons()` helper methods, mirroring
  `HouseholdEntity.additionalPersons()` on the entity side.
- Legacy: the old `customers` / `customers_addpersons` tables (see
  `R__00067_household_person_refactor.sql`) were superseded by `households`/`persons`. They are kept
  read-only for a production observation window before a separate cleanup migration
  (`R__00068_household_person_cleanup.sql`) drops them. Do not read/write those tables or build new
  features against them — they are not part of this module's persistence.

## The `main_person_id` chicken-and-egg problem

`households` and `persons` reference each other (`households.main_person_id -> persons.id` and
`persons.household_id -> households.id`), so a brand-new household and its main person can never be
inserted in the same statement — neither row can be written first if both foreign keys were
`NOT NULL`. That's why `households.main_person_id` is **nullable at the DB level**, even though in a
correct, fully-saved household it is never actually null.

[`HouseholdService.saveWithMainPerson(entity)`](internal/HouseholdService.kt) is the method that
deals with this. The rule it follows:

```kotlin
private fun saveWithMainPerson(entity: HouseholdEntity): HouseholdEntity {
    val mainPerson = entity.persons.firstOrNull { it.isMainPerson }

    // The main person row already exists - a single save is enough.
    if (mainPerson?.id != null) {
        entity.mainPerson = mainPerson
        return householdRepository.saveAndFlush(entity)
    }

    // Brand new main person: write the household without the pointer first, then its persons,
    // and only afterwards point the household at its main person.
    entity.mainPerson = null
    val savedEntity = householdRepository.saveAndFlush(entity)

    savedEntity.mainPerson = savedEntity.persons.firstOrNull { it.isMainPerson }
    return householdRepository.saveAndFlush(savedEntity)
}
```

- **Existing household, existing main person** (typical update): one `saveAndFlush` is enough
  because the main person's row (and its id) already exists, so JPA can cascade-save
  household+persons+pointer together.
- **Brand-new household** (create, or an update where the main person row itself is new): the
  household is first saved with `mainPerson = null`, which cascade-saves its `persons` collection
  (`@OneToMany(cascade = [CascadeType.ALL], orphanRemoval = true)` on `HouseholdEntity.persons`) and
  gives every person row an id. Only then is `mainPerson` set to the now-persisted main person and
  saved again with a second `saveAndFlush`.

`createHousehold`/`updateHousehold` both funnel through `saveWithMainPerson` — never call
`householdRepository.save()` directly on a new household if it might not yet have a persisted main
person.

The mirror image happens on delete:
[`HouseholdService.deleteHouseholdByHouseholdId`](internal/HouseholdService.kt) sets
`household.mainPerson = null` and flushes *before* calling `householdRepository.delete(household)` -
otherwise deleting the persons (via `orphanRemoval`/cascade) would violate the
`households -> persons` foreign key while `main_person_id` still points at a row being removed.

[`HouseholdConverter.mapHouseholdToEntity`](internal/converter/HouseholdConverter.kt) has its own
related gotcha: the main person's `PersonEntity` is always looked up and updated in place (via
`storedMainPerson`), never deleted-and-recreated, so `main_person_id` never has to briefly point at
a row that's about to be orphan-removed on the same flush.

## Components

### `HouseholdController` (`/api/households`)
REST endpoint for household CRUD, validation, PDF generation, above-cost-limit listing, duplicate
search and duplicate merging. All endpoints require `CUSTOMER` (or `CUSTOMER_DUPLICATES` /
`CUSTOMERS_ABOVE_LIMIT` for the respective sub-features). Notable behavior:
- `createHousehold`/`updateHousehold` take a `force: Boolean` query param and check
  `isSupervisor` (role `SUPERVISOR`) from the JWT - see "Income validation" below for what that
  gates.
- `generatePdf` streams back a PDF (`HouseholdPdfType.MASTERDATA`, `IDCARD`, or `COMBINED`).

### `HouseholdService` (`internal`)
The core service: `createHousehold`, `updateHousehold`, `findByHouseholdId`, `getHouseholds`
(paginated search with `HouseholdEntity.Specs` JPA specifications for name/postProcessing/
cost-contribution/valid filters), `getHouseholdsAboveLimit`, `generatePdf`,
`deleteHouseholdByHouseholdId`. Owns the `saveWithMainPerson` save-order logic described above.
Duplicate merging (`mergeHouseholds` used to live here) has moved to `HouseholdMergeService` - see
below.

`getHouseholdsAboveLimit` is worth knowing about if you touch it: the "above limit" filter can't be
expressed in SQL because it depends on `IncomeValidatorService`, not stored columns, so it loads
*every* valid household (via `HouseholdRepository.findAll(spec)`, which eagerly fetches `persons`
via `@EntityGraph` to avoid N+1), evaluates income validation for each in memory, and then paginates
the already-computed in-memory list.

### `HouseholdConverter` (`internal/converter`)
Bidirectional mapping between the API-facing `Household`/`Person` models and
`HouseholdEntity`/`PersonEntity`. `mapHouseholdToEntity` also:
- Resolves the next `household_id` from the `household_id_sequence` (via
  `HouseholdRepository.getNextHouseholdSequenceValue()`) for new households.
- Stamps `issuer` from the authenticated user's linked `EmployeeEntity` (`userEntity.employee`) -
  this is how the module gets employee data without depending on `base::employee`.
- Tracks `prolongedAt`: set to "now" whenever an update pushes `validUntil` further into the future
  than it already was.
- Force-clears `migrated = false` whenever a household is saved through the app (there's a
  `// TODO revisit on 01.01.2026` comment - this flag exists only to track post-refactor
  data-quality fixups and can likely be removed after that date).

**Never use `mapHouseholdToEntity` for merge re-parenting**: it does
`householdEntity.persons.clear(); householdEntity.persons.addAll(mappedPersons)`, relying on
`orphanRemoval = true` to delete anyone not present in the incoming person list. Feeding it anything
less than the complete target person list - which is exactly what a merge would do - silently
deletes people. `HouseholdMergeService` re-parents persons via dedicated bulk repository updates
instead (see below); it only calls this converter's other direction, `mapEntityToHousehold`.

### `HouseholdMergeService` / `HouseholdMergePlanner` (`internal`)
Replaces what used to be a one-way deletion (`HouseholdService.mergeHouseholds` ->
`deleteHouseholdByHouseholdId` per source, no data preserved) with a real compare/merge, exposed as
`GET /households/{id}/merge-preview` and an extended `POST /households/{id}/merge`
(`HouseholdMergeRequest.fieldSelections`).

**Field conflicts are resolved by side, not by value.** The client picks which household -
`sourceHouseholdId == null` meaning the target - wins per `HouseholdMergeField`; the server then
copies that household's already-validated value onto the target. This deliberately does **not**
route through `updateHousehold`/`mapHouseholdToEntity`: that path re-validates income (can silently
invalidate the target or 409 a supervisor) and requires the complete persons list (see the
`mapHouseholdToEntity` warning above). `ADDRESS` and `LOCK_STATE` are atomic groups - all their
sub-fields always come from the same side, since a mixed address/lock tuple would be incoherent.
`HouseholdMergePlanner` (a stateless, DB-free object) holds the field-equality/conflict logic shared
by preview and merge, so the two can never disagree about what counts as a conflict.

**The target's main person is never replaced** - the duplicate detector already matched on main
person names, so both sides are the same human by construction. A source's main person either
merges away as a duplicate of the target's, or moves across as a non-main additional person.

**Person de-duplication** matches on normalized `(lastname, firstname, birthDate)` - trimmed,
lower-cased, internal whitespace collapsed; if any of the three is missing on either side, it's
never considered a match (incomplete master data is common here, see
`HouseholdEntity.Specs.postProcessingNecessary()`, and silently discarding a family member because of
a blank field would be worse than an occasional missed duplicate). Matches are tracked cumulatively
across all sources being merged, not just against the target, so two sources both carrying the same
not-on-target person get deduplicated against each other too.

**`distributions_households` has a `unique(distribution_id, household_id)` constraint** that a naive
re-point would violate whenever the target and a source (or two sources) attended the same
distribution. The planner resolves this by grouping every attendance row of the whole merge set by
`distribution_id`: the target's own row wins if it has one, otherwise the lowest-id (earliest
registered) source row does. The winner's `ticketNumber` is never overwritten; `processed` is
OR-folded and `costContributionPaid` is AND-folded onto it from every row it beats, then the losers
are deleted - preserving whichever record shows "did collect food" / "still owes payment" rather
than silently picking one row and discarding the other's state.

**Execution order matters** and is the part most likely to regress: `HouseholdEntity.persons`/
`.documents` are `cascade = ALL, orphanRemoval = true`, so touching a source's collection in memory -
even just removing an element - schedules a DELETE for a row being simultaneously re-parented, and
deleting the source household cascades REMOVE to whatever the persistence context still believes is
in those collections. `HouseholdMergeService.merge` therefore never mutates
`source.persons`/`.documents` directly; every re-parent is a bulk
`@Modifying(flushAutomatically = true, clearAutomatically = true)` repository update (new methods on
`PersonRepository`, `HouseholdNoteRepository`, `DocumentRepository`, `DistributionHouseholdRepository`
- `HouseholdNoteEntity`/`DistributionHouseholdEntity` have no `mappedBy` back-reference on
`HouseholdEntity` at all, so without an explicit re-point they're invisible to JPA and would only
ever be reached via the DB's `on delete cascade`, i.e. destroyed with the source). Field selections
are applied first, while target/sources are still the fresh entities loaded by `resolve()`; only
after every child row has somewhere to land is each source shell deleted via the existing, unchanged
`HouseholdService.deleteHouseholdByHouseholdId`.

**Income is deliberately not re-validated after a merge.** Moving additional persons onto the target
can push it over the limit; rather than blocking the merge or silently invalidating the target, the
merged household simply surfaces in the existing `GET /households/above-limit` review flow
afterwards, same as any other over-limit household.

Every new repository method added for this takes the entity primary key (`HouseholdEntity.id`),
never the business `householdId` - mixing the two is the most likely silent bug in this area.

### `HouseholdDuplicationService` (`internal`)
Finds potential duplicate households via a raw SQL query (`JdbcTemplate`, not JPA) comparing every
household's main person against every other household's main person:
- `soundex(lastname)` / `soundex(firstname)` must match (phonetic equality), **and**
- `levenshtein(lower(firstname+lastname))` between the two full names must be `< 4`, **and**
- `levenshtein(lower(street+housenumber+door))` between the two addresses must be `< 10`.

Both conditions must hold - phonetically-similar names at very different addresses (or vice versa)
are not flagged. Since firstname/lastname now live on `persons` rather than `households`, the query
joins through `households.main_person_id` (see the `MAIN_PERSON_CTE` companion constant) rather than
reading name columns directly off `households`. Pagination here is one duplicate *group* per page
(`PageRequest.of(page, 1)`), not one household per page.

The self-join condition anchors each match on the *smaller* `household_id`
(`household.household_id < compare.household_id`, not `<>`) so an unordered pair {A, B} surfaces as
exactly one row - anchored on whichever of A/B has the lower id - instead of two mirrored rows (once
per direction).

`HouseholdController.mergeIntoHousehold`/`getMergePreview` hand off to `HouseholdMergeService` for
the actual merge - see below for how field conflicts, person de-duplication, and note/distribution
re-parenting work.

### `IncomeValidatorService` / `IncomeValidatorServiceImpl` (`internal/income`)
Validates a household's combined income against configurable limits stored in `StaticValueRepository`
(`StaticValueType.ADDITIONAL_ADULT`, `ADDITIONAL_CHILD`, `TOLERANCE`, `FAMILY_ALLOWANCE`,
`SIBLING_ADDITION`, `CHILD_TAX_ALLOWANCE`, and a per-person-count base limit). Key rules baked into
the implementation:
- A person `isChild()` if under 15; `isChildForFamilyAllowance()` if 24 or under (a wider bracket).
- Persons with `excludeFromIncomeCalculation` (mapped from `Person.excludeFromHousehold`) are
  excluded from the income sum entirely, but can still receive family allowance.
- The base limit is looked up per (adult count, child count) via
  `StaticValueRepository.findLatestForPersonCount`, then a flat `TOLERANCE` amount is added on top
  before comparing against the summed income - `IncomeValidatorResult.toleranceValue` reports how
  much tolerance was applied, `amountExceededLimit` how far over the (tolerance-inclusive) limit the
  household is.

`HouseholdService.mapToValidationPersons` is the adapter that turns a `Household`'s persons into
`IncomeValidatorPerson`s before calling this service - both `validate()` (called ad-hoc by the
frontend before submit) and `createHousehold`/`updateHousehold` (called again server-side, since the
client-computed result can't be trusted) go through it.

**Supervisor/force gotcha:** if validation fails, `createHousehold`/`updateHousehold` behave
differently depending on the caller's role:
- Non-supervisor: the household is saved anyway, but forced `validUntil = yesterday` (i.e. saved as
  already-invalid), and an `errorMsg` is returned to inform the user.
- Supervisor without `force=true`: rejected outright with `ConflictException` (409 Conflict) -
  supervisors get a chance to review and confirm before overriding.
- Supervisor with `force=true`: saved as-is (validity untouched), no error.

### `HouseholdPdfService` (`internal/masterdata`)
Generates the household's PDFs (master data sheet, ID card, or a combined document) using
`PDFService` (in `common/pdf`), which renders Apache FOP XSL-FO templates from
`backend/src/main/resources/pdf-templates/customer-pdf/` (`masterdata-document.xsl`,
`idcard-document.xsl`, `masterdata-idcard-document.xsl` - note: still under a `customer-pdf`
directory, matching the "customer" legacy naming). `Model.kt` in the same package defines the
XML-serializable `PdfData`/`PdfCustomerData`/`PdfAddressData`/`PdfAdditionalPersonData`/
`PdfIdCardData` tree that gets marshalled to XML and fed to the XSL-FO transform. The ID card also
embeds a QR code (containing the household's `household_id`) generated in-process via the `qrcode`
library, with the Tafel logo overlaid.

### `HouseholdNoteController` / `HouseholdNoteService` (`internal/note`)
Free-text notes attached to a household (`household_notes` table,
[`HouseholdNoteEntity`](../../database/model/household/HouseholdNoteEntity.kt)), each stamped with
the authoring employee and a timestamp. Simple create/list (paginated, 5 per page, newest first);
no update or delete endpoint exists.

## Gotchas / best practices

1. **Never bypass `saveWithMainPerson`.** Any new code path that persists a `HouseholdEntity`
   directly (instead of going through `HouseholdService`) must reproduce the two-phase save when the
   main person might be new, or you will hit a FK violation or leave `main_person_id` null.
2. **Deleting a household must null out `mainPerson` first.** See
   `deleteHouseholdByHouseholdId` - skipping this step breaks on the `households -> persons` FK.
3. **Income validation happens twice on write** (once implicitly via the request the frontend
   already validated, once again server-side in `createHousehold`/`updateHousehold`) - never trust
   a client-supplied "valid" flag.
4. **Duplicate detection reads `persons` via `households.main_person_id`, not `households` directly**
   - if you add new duplicate-matching criteria, remember firstname/lastname/address for comparison
   live partly on `persons` (name) and partly on `households` (address).
5. **`customers`/`customers_addpersons` are legacy and read-only.** Don't add new reads or writes
   against them; they exist only for a transitional observation window.
6. This module can only see `base::country` and `base::exception` (per
   `package-info.java`) - if you need employee data, go through `UserEntity.employee` /
   `HouseholdEntity.issuer`, not a direct `base::employee` dependency.
