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
directly; it reaches `EmployeeEntity` through `UserEntity.employee` instead (see below), which is an
accepted pattern rather than a bypass - the shared `database.model.*` layer is available to every
module, and named interfaces gate service/DTO access only (see
[`base`'s README](../base/README.md#employees-are-reachable-two-ways)).

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
- **A household or person may be incomplete on purpose.** Of the fields the customer form marks
  required, only `single_parent` is enforced by the schema (`not null` with a `false` default, see
  `R__00091_household_single_parent_not_null.sql`) — a checkbox has no "unknown" state. The address
  parts and a person's name, birth date and gender stay nullable: that incompleteness is exactly
  what `HouseholdEntity.Specs.postProcessingNecessary()` searches for and what the "Daten
  unvollständig" filter in the customer search exists to surface. The 2023 import left rows in that
  shape that cannot be reconstructed, `testdata.sql` seeds household 106 the same way to exercise
  the filter, and `HouseholdEntitySpecsIT` persists incomplete persons — a column constraint would
  make all of those impossible to write. Presence is enforced one layer up instead, by `@NotBlank`
  /`@NotNull` on `HouseholdAddress` and `Person`. `HouseholdRequiredFieldsIT` locks the decision
  down. `telephone_number` is not enforced anywhere on the backend — only the frontend form treats
  it as mandatory.
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
REST endpoint for household CRUD, validation, PDF generation, the GDPR data takeout, above-cost-limit
listing, duplicate search and duplicate merging. All endpoints require `CUSTOMER` (or
`CUSTOMER_DUPLICATES` / `CUSTOMERS_ABOVE_LIMIT` for the respective sub-features). Notable behavior:
- `createHousehold`/`updateHousehold` take a `force: Boolean` query param and check
  `isSupervisor` (role `SUPERVISOR`) from the JWT - see "Income validation" below for what that
  gates.
- `generatePdf` streams back a PDF (`HouseholdPdfType.MASTERDATA`, `IDCARD` or `PRIVACY_NOTICE` - the
  latter a printable privacy-notice/consent sheet for the customer to sign at intake, GDPR G2/#3177;
  see `docs/architecture/gdpr-compliance.md`).
- `generatePrivacyNoticeTemplatePdf` (`GET /households/privacy-notice-template`, flat like
  `/above-limit`/`/overview` below rather than nested under `/{householdId}`) streams the same
  privacy-notice sheet with no household reference - reachable from the customer search screen, for
  a walk-in before a case record exists.

### `HouseholdService` (`internal`)
The core service: `createHousehold`, `updateHousehold`, `findByHouseholdId`, `getHouseholds`
(paginated search with `HouseholdEntity.Specs` JPA specifications - one free-text `searchInput`
matched against the trigger-maintained `search_text` column plus the postProcessing/
cost-contribution/valid/locked/`missingPrivacyNotice` filters, see `SearchTextSpecs`).
`missingPrivacyNotice` (`HouseholdEntity.Specs.missingPrivacyNoticeDocument()`) is a `NOT EXISTS`
subquery over `household_documents` for `documentType = PRIVACY_NOTICE` - it reads the same signal
`DocumentType.PRIVACY_NOTICE` uploads write (GDPR G2, issue #3177), not a stored consent flag; there
still is none. `getHouseholdsAboveLimit`,
`getHouseholdsOverview`, `generatePdf`,
`deleteHouseholdByHouseholdId`. Owns the `saveWithMainPerson` save-order logic described above.
Duplicate merging (`mergeHouseholds` used to live here) has moved to `HouseholdMergeService` - see
below.

`findByHouseholdId` (the household detail lookup, `GET /households/{id}`) records one
`AuditOperation.READ` entry per call the same way `generatePdf` does, de-duplicated per
actor+household within `tafeladmin.audit.readDedupeWindow` so reloading the detail screen isn't
counted as a fresh read for `ExcessiveReadAccessDetectionService`'s breach detection (issue #3430).

`getHouseholdsOverview` (`GET /households/overview`) lists the households whose `createdAt`
("Neu") or `prolongedAt` ("Verlängert", see `HouseholdConverter` below) falls within a target
distribution's `[startedAt, endedAt ?: now()]` window - `distributionId` defaults to the newest
*closed* distribution (`DistributionRepository.findFirstByEndedAtIsNotNullOrderByStartedAtDesc()`),
matching the first entry of the closed-only distribution list the frontend's selector offers.
It injects `DistributionRepository` directly (from `database.model.distribution`) -
that's fine despite the module's `allowedDependencies` below only listing `base::country`/
`base::exception`: Spring Modulith's boundary only governs `modules.*` packages, not the shared
`database.model.*` entity/repository layer (see `DashboardService` for the same pattern).

`getHouseholdsAboveLimit` is worth knowing about if you touch it: the "above limit" filter can't be
expressed in SQL because it depends on `IncomeValidatorService`, not stored columns, so it loads
*every* valid household (via `HouseholdRepository.findAll(spec, sort)`, which eagerly fetches
`persons` via `@EntityGraph` to avoid N+1), evaluates income validation for each in memory, and then
paginates the already-computed in-memory list. Every page view therefore recomputes the whole set -
deliberately, so the list is never stale
(`docs/architecture/adr/0049-the-above-limit-list-is-computed-live-not-materialized.md`).
What the endpoint keeps small is the work per run: validation reads the persons straight off the
entities (`mapEntityToValidationPersons`, the entity-side twin of `mapToValidationPersons` - both
must keep the same rules), and only the requested page's households are mapped to a
`HouseholdResponse`, since that mapping resolves the issuer, the `lockedBy` user and every person's
country.

### `HouseholdConverter` (`internal/converter`)
Bidirectional mapping between the API-facing `Household`/`Person` models and
`HouseholdEntity`/`PersonEntity`. `mapHouseholdToEntity` also:
- Resolves the next `household_id` from the `household_id_sequence` (via
  `HouseholdRepository.getNextHouseholdSequenceValue()`) for new households.
- Stamps `issuer` from the authenticated user's linked `EmployeeEntity` (`userEntity.employee`) -
  this is how the module gets employee data without depending on `base::employee`. It needs the
  managed entity to assign, which is exactly what that named interface's service doesn't hand out.
- Tracks `prolongedAt`: set to "now" whenever an update pushes `validUntil` further into the future
  than it already was. Every other update leaves the stored value alone - `getHouseholdsOverview`'s
  "Verlängert" list and `DistributionStatisticService.countCustomersProlonged` both select on
  `prolongedAt` falling inside a distribution's window, so clearing it on an unrelated later edit
  would drop the household out of that distribution's numbers.

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

`dismiss(householdId, otherHouseholdId)` records a reviewer's "kein Duplikat" decision on the
`/kunden/duplikate` screen: it normalizes the two ids into `household_id_low`/`household_id_high`
(matching the anchor ordering above) and stores them in `household_duplicate_dismissals`
(`HouseholdDuplicateDismissalEntity`/`Repository`). `DUPLICATE_CONDITIONS`'s `NOT EXISTS` anti-join
against that table is what keeps a dismissed pair from resurfacing on a later visit - without it, a
decision made once would reappear on every review pass. Its columns hold the business `household_id`
(not the JPA primary key), so its foreign keys reference `households.household_id`
(`households_household_id_key`, a unique index rather than the primary key) with
`on delete cascade` (`R__00110_household_duplicate_dismissals_fk.sql`) - both `household_id_low` and
`household_id_high` cascade independently, so deleting either household in a dismissed pair removes
the dismissal row.

`HouseholdController.mergeIntoHousehold`/`getMergePreview` hand off to `HouseholdMergeService` for
the actual merge - see below for how field conflicts, person de-duplication, and note/distribution
re-parenting work.

### `IncomeValidatorService` / `IncomeValidatorServiceImpl` (`internal/income`)
Validates a household's combined income against configurable limits stored in `StaticValueRepository`
(`StaticValueType.ADDITIONAL_ADULT`, `ADDITIONAL_CHILD`, `TOLERANCE`, `FAMILY_ALLOWANCE`,
`SIBLING_ADDITION`, `CHILD_TAX_ALLOWANCE`, and a per-person-count base limit). Key rules baked into
the implementation:
- **Every lookup is resolved from one `IncomeRateCard`** - the static values in effect on one date,
  read with a single `StaticValueRepository.findAllValidAt` and answered from memory afterwards.
  Nothing is cached, so an amount an administrator edits applies to the next validation on every
  instance, and the arithmetic is a pure function of the persons and that card. `validateAll` shares
  one card across every household it is given, which is what makes a `getHouseholdsAboveLimit` run
  internally consistent (`docs/architecture/adr/0048-static-values-resolved-from-a-per-run-snapshot.md`).
- A person `isChild()` if under 15; `isChildForFamilyAllowance()` if 24 or under (a wider bracket) -
  both measured against the card's `referenceDate`, so a validation crossing midnight still resolves
  against a single date.
- The `FAMILY_ALLOWANCE` rows are "from age X" brackets, so a child is counted at the **highest tier
  whose `age` they have already reached** (the seeded 0/3/10/19 tiers mirror the Austrian
  Familienbeihilfe rate card, where the amount rises with the child's age) - a 12-year-old gets the
  `age = 10` tier, everyone from 19 up to the 24 limit the `age = 19` one.
- The result carries an `IncomeValidatorDetails` next to the two totals: the income split into
  income/Familienbeihilfe/Kinderabsetzbetrag/Geschwisterstaffel, and the limit into base limit,
  per-person surcharges and tolerance. It adds no rule - the parts are exactly the totals, split up -
  and exists so the frontend's validation dialog can show how a result came about.
- Persons with `excludeFromIncomeCalculation` (mapped from `Person.excludeFromHousehold`) count for
  nothing: neither their income nor their Familienbeihilfe/Kinderabsetzbetrag is added, they are not
  counted for the Geschwisterstaffel tier, and they do not raise the limit. The flag means "not part
  of this household", so it has to apply to both sides of the comparison - counting a child's family
  allowance while ignoring the child for the limit can only ever make a household look worse off
  than it is.
- The base limit is looked up per (adult count, child count) via `IncomeRateCard.incomeLimit`, then a
  flat `TOLERANCE` amount is added on top before comparing against the summed income -
  `IncomeValidatorResult.toleranceValue` reports how much tolerance was applied,
  `amountExceededLimit` how far over the (tolerance-inclusive) limit the household is.
- **A composition with no configured base limit is rejected**, with a `BusinessRuleException` naming
  the (adults, children) combination. Every lookup on the rate card answers zero when nothing is
  configured - an allowance nobody maintains simply adds nothing - but a base limit of 0.00 is a
  meaningful value, so `IncomeRateCard.incomeLimit` answers `null` instead and the validator refuses
  rather than declaring the household ineligible by its entire income. Two things reach it: a
  household with no adult at all (the counts are capped before the lookup, so every other reachable
  combination is seeded), and an `INCOME_LIMIT` row that is missing or whose validity window has
  lapsed. Because of that, `validateAll` hands back a `Result` per household instead of aborting the
  whole batch - `getHouseholdsAboveLimit` logs the rejected household at WARN and leaves it out.

`HouseholdService.mapToValidationPersons` is the adapter that turns a `Household`'s persons into
`IncomeValidatorPerson`s before calling this service - both `validate()` (called ad-hoc by the
frontend before submit) and `createHousehold`/`updateHousehold` (called again server-side, since the
client-computed result can't be trusted) go through it. `getHouseholdsAboveLimit` holds entities
rather than DTOs and uses `mapEntityToValidationPersons` instead; the two must keep the same rules.

**Supervisor/force gotcha:** if validation fails, `createHousehold`/`updateHousehold` behave
differently depending on the caller's role:
- Non-supervisor: the household is saved anyway, but forced `validUntil = yesterday` (i.e. saved as
  already-invalid), and an `errorMsg` is returned to inform the user.
- Supervisor without `force=true`: rejected outright with `ConflictException` (409 Conflict) -
  supervisors get a chance to review and confirm before overriding.
- Supervisor with `force=true`: saved as-is (validity untouched), no error.

### `HouseholdPdfService` (`internal/masterdata`)
Generates the household's PDFs (master data sheet, ID card or privacy-notice sheet) using
`PDFService` (in `common/pdf`), which renders Apache FOP XSL-FO templates from
`backend/src/main/resources/pdf-templates/customer-pdf/` (`masterdata-document.xsl`,
`idcard-document.xsl`, `privacy-notice-document.xsl` - note: still under a `customer-pdf`
directory, matching the "customer" legacy naming). `Model.kt` in the same package defines the
XML-serializable `PdfData`/`PdfCustomerData`/`PdfAddressData`/`PdfAdditionalPersonData`/
`PdfIdCardData`/`PrivacyNoticePdfData` tree that gets marshalled to XML and fed to the XSL-FO
transform. The ID card also embeds a QR code (containing the household's `household_id`) generated
in-process via the `qrcode` library, with the Tafel logo overlaid.

`generatePrivacyNoticePdf` carries only the household's id, main person's name and today's date -
deliberately less than `PdfData`, since the notice sheet is a static text plus a signature line, not
a data export. There is no stored consent field anywhere in the application: the printed, signed
sheet handed to the customer at intake and filed outside the app is the whole record (GDPR G2,
issue #3177). The notice text in `includes/privacy-notice.xsl` - purpose, legal basis, retention,
rights and contact - is written for this intake flow; controller identity, DPO contact and the
rights/complaints wording come from the organisation's own published privacy notice (see the file's
own header comment for the source and date checked), since that page has no section covering
Team-Österreich-Tafel/aid-recipient data at all. See `docs/architecture/gdpr-compliance.md` and
issue #3185.

`generatePrivacyNoticeTemplatePdf` is the reference-less sibling: the same template with
`householdId`/`fullName`/`issuedAtDate` all blank. `branding.xsl`'s shared `field-with-label`
renders a blank value as a non-breaking space rather than nothing, so the "Name"/"Ort, Datum"/
"Unterschrift" lines all keep the same height whether or not there is text above them - a genuinely
empty `fo:block` collapses to zero height in FOP, which visibly misaligns the accent-rule
"underline" next to fields that do have a value. `privacy-notice.xsl`'s subtitle ("Kundennummer …")
is likewise omitted entirely, not shown blank, when `householdId` is empty.

### `HouseholdNoteController` / `HouseholdNoteService` (`internal/note`)
Free-text notes attached to a household (`household_notes` table,
[`HouseholdNoteEntity`](../../database/model/household/HouseholdNoteEntity.kt)), each stamped with
the authoring employee and a timestamp. Simple create/list (paginated, 5 per page, newest first);
no update or delete endpoint exists. `HouseholdNoteItem` exposes the note's `id` because the
timestamp does not identify a note - notes written in one batch share it to the microsecond, so the
frontend needs the id as a stable list key.

### `HouseholdExportService` (`internal`)
The GDPR Art. 15/20 data takeout (G5, issue #3179, see
`docs/architecture/adr/0051-data-subject-requests-delegate-to-each-areas-own-export-and-delete.md`),
exposed as a single `HouseholdController` endpoint
mirroring `generatePdf`'s `InputStreamResource`/`Content-Disposition` shape:
- `GET /{householdId}/export` - one ZIP (`java.util.zip.ZipOutputStream`) containing the household
  record - master data (including `prolongedAt` and whether a privacy-notice document is on file),
  persons, notes (via `HouseholdNoteRepository.findAllByHouseholdHouseholdIdOrderByCreatedAtDescIdDesc`,
  the unpaged overload - a page-size cap would silently truncate the record; each of these three also
  carries who last changed it, resolved from `updatedBy`'s plain user id via one batched
  `UserRepository.findAllById` lookup), distribution attendance history
  (`DistributionHouseholdRepository.findAllByHouseholdEntityIds`) and the list of uploaded documents -
  including each document's linked person and uploader - as `datenexport.pdf` (rendered through the
  same `PDFService`/XSL-FO pipeline as every other PDF in the app, see
  `pdf-templates/household-export/export-document.xsl` and
  `docs/architecture/adr/0009-server-side-document-generation-with-xsl-fo.md`), plus every uploaded
  document itself, read via `DocumentStorageService`. Deduplicates same-named documents so a second
  `ausweis.jpg` doesn't silently overwrite the first inside the archive, and reserves the PDF's own
  file name first so an actual upload named `datenexport.pdf` gets renamed the same way instead of
  colliding with it.

One combined archive rather than several separate downloads: a data-subject request normally wants
"everything you have on me" in one piece. The PDF's rows (`HouseholdExportModel.kt`) are built once
per request from the same household/notes entities. The service stores nothing - the archive is built
on request and never written to disk or a table. It records one `AuditOperation.READ` entry
(`entityType = "Household"`, see issue #3180) the same way `generatePdf` does, and is deliberately not
a `readOnly` transaction for the same reason: `AuditLogWriter.record`'s write only takes effect for a
transaction that actually commits. Deliberately excludes `audit_log` entries - see the takeout plan's
§4 for why that's left an open question rather than answered here. Shares `buildHouseholdFilename`
(`internal/HouseholdFilenames.kt`) with `HouseholdService.generatePdf` so the filename schemes don't
drift.

### `HouseholdDocumentController` / `DocumentScannerController` / `DocumentScannerSseController` (`internal/document`)
`HouseholdDocumentController` (`/api/households/{householdId}/documents`) is upload/list/download/
delete for a household's documents (ID scans, proofs of income, the signed privacy notice - see
`DocumentType`), stored as plain files under `tafeladmin.storage.documentsPath` with metadata in
`household_documents` (`DocumentStorageService`). `DocumentScannerController`
(`/api/document-scanner-files`) lists and reads the not-yet-imported files a physical document
scanner writes to `tafeladmin.storage.scannerPath` (see "Scanner Folder" in the root `CLAUDE.md`),
which `HouseholdDocumentController.importScannerDocument` turns into a proper document.
`DocumentScannerSseController` (`/api/sse/document-scanner-files`) is that same file list pushed
live as it changes.

All three controllers require `CUSTOMER_DOCUMENTS`, not `CUSTOMER` - separate from the rest of this
module's permission on purpose, since these hold the most sensitive artefacts on a household
(GDPR G7, `docs/architecture/gdpr-compliance.md`, issue #3181,
`docs/architecture/adr/0050-customer-documents-split-into-its-own-permission.md`).

### `ScannerFileCleanupService` (`internal/document`)
GDPR gap G18 (`docs/architecture/gdpr-compliance.md`): a nightly job (05:05, `@Scheduled`,
`@SchedulerLock`) that deletes any file on the scanner share
(`tafeladmin.storage.scannerPath`) older than `tafeladmin.storage.scannerFileRetention` (default 7
days). Unlike `DocumentStorageCleanupService`, a scanner file has no database row to reconcile
against at all - `ScannerFileService` only ever lists/reads/deletes the folder directly - so this
only ever needs a file's own last-modified timestamp. `push`'s `ScannerFileExpiryReminderService`
warns before this job deletes anything, reading the same share independently rather than reacting to
an event this service would have to publish - see that service's KDoc for why.

### `HouseholdRetentionService` (`internal`)
GDPR gap G1 (`docs/architecture/gdpr-compliance.md`): a nightly job (06:00, `@Scheduled`) that
deletes every household whose `validUntil` is further in the past than
`tafeladmin.householdDeletion.retentionYears` (default 7 years), and everything attached to it -
persons, notes, documents (rows and files on disk), attendance history and duplicate dismissals
naming it. Candidate ids are
selected and locked with `FOR UPDATE SKIP LOCKED`
(`HouseholdRepository.findExpiredHouseholdIdsSkipLocked`) inside the same transaction that then
deletes each of them through `HouseholdService.deleteHouseholdByHouseholdId` - the same method a
staff member's manual delete uses - so a second instance's run skips a household this one already
claimed (ADR-0047) instead of racing it. `tafeladmin.householdDeletion.enabled` is a kill switch
independent of the retention window. Modelled directly on `AuditRetentionService`. GDPR gap G18: a
run above `tafeladmin.householdDeletion.maxDeletionsPerRun` refuses to delete anything and alerts
administrators (`RETENTION_RUN` push notification) instead of proceeding, same for a run that
throws; the customer search screen's "Wird in den nächsten 30 Tagen gelöscht" filter chip
(`HouseholdEntity.Specs.willBeDeletedSoon`) previews what the job is about to sweep.

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
