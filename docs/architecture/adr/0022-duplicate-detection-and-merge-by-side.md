# ADR-0022: Fuzzy duplicate detection, and merges resolved by side rather than by value

**Status:** accepted · **Recorded:** 2026-08-09

## Context

The same household gets registered twice — a different spelling of the name, a new address, a
registration desk that did not find the existing record. The consequence is not cosmetic: a duplicate
household can collect twice and distorts every statistic.

Exact matching does not find these; that is precisely why they exist. But over-matching is worse than
under-matching here: wrongly proposing two different families as duplicates wastes staff time and
risks a merge that destroys a real household's data.

Cleaning one up is not a delete either. Both records may carry real history — notes, documents,
persons, distribution attendance — and whichever is discarded takes its history with it unless
something moves it.

## Decision

**Detection is phonetic *and* edit-distance based, over both name and address. Merging is a
field-by-field picker resolved by side, with explicit re-parenting of every child row.**

Detection (`HouseholdDuplicationService`, one hand-written SQL query via `JdbcTemplate`, comparing
each household's main person against every other's):

- `soundex(lastname)` **and** `soundex(firstname)` must match, **and**
- `levenshtein` over the two lower-cased full names must be `< 4`, **and**
- `levenshtein` over the two lower-cased addresses (street + number + door) must be `< 10`.

All three must hold — phonetically similar names at very different addresses are not flagged, and
neither is the reverse. Each unordered pair surfaces once, anchored on the lower `household_id`
(`<`, not `<>`), instead of twice in mirror image. Pagination is one duplicate *group* per page.

Merging (`HouseholdMergeService` / `HouseholdMergePlanner`):

- Conflicts are resolved **by side, not by value**: the client picks which household wins per field,
  and the server copies that household's already-validated value onto the target. `ADDRESS` and
  `LOCK_STATE` are atomic groups — a mixed address is incoherent.
- The merge deliberately does **not** go through `updateHousehold`/`mapHouseholdToEntity`, which
  would re-validate income and require the complete persons list.
- The target's main person is never replaced: the detector matched on main-person names, so both
  sides are the same human by construction.
- Persons are de-duplicated on normalized `(lastname, firstname, birthDate)`; if any of the three is
  missing on either side it is never treated as a match.
- Colliding `distributions_households` rows (target and source at the same distribution) are folded:
  the ticket number of the winner is kept, `processed` is OR-folded and `costContributionPaid`
  AND-folded, then the losers are deleted.
- Every re-parent is an explicit bulk `@Modifying` repository update, never a mutation of a source's
  cascading collections.
- `HouseholdMergePlanner` is a stateless, DB-free object shared by the preview and the merge, so the
  two can never disagree about what counts as a conflict.

## Consequences

- Real duplicates are found despite spelling variation, and the two-dimensional requirement keeps
  false positives low enough that reviewing candidates stays worthwhile.
- The thresholds (`< 4`, `< 10`) are tuned constants with no principled derivation. They will
  occasionally miss a duplicate and occasionally propose a non-duplicate — which is why detection
  *proposes* and a human decides.
- No data is lost on merge: notes, documents, persons and attendance history move to the target, and
  the attendance folding preserves "did collect food" and "still owes payment" rather than picking
  one row arbitrarily.
- Incomplete master data is treated as "not a match" rather than "probably a match", because silently
  discarding a family member is worse than a missed person-level duplicate.
- **Execution order is the fragile part.** `persons`/`documents` are `cascade = ALL, orphanRemoval =
  true`, so touching a source's collection in memory schedules a delete for a row being re-parented —
  and deleting the source cascades to whatever the persistence context still believes is in those
  collections. `HouseholdNoteEntity` and `DistributionHouseholdEntity` have no back-reference at all
  and are invisible to JPA, so without an explicit re-point they are destroyed with the source.
- Income is deliberately **not** re-validated after a merge. Moving persons onto the target can push
  it over the limit; rather than blocking the merge or invalidating the household, it surfaces in the
  existing above-limit review flow ([ADR-0024](0024-server-side-income-validation.md)).
- The detection query is native SQL against `persons` joined through `households.main_person_id`. New
  matching criteria have to account for names living on `persons` and the address on `households`.

## Alternatives considered

**Exact matching on name + birthdate.** Rejected: it finds none of the duplicates that actually
occur, since they exist *because* something was entered differently.

**Trigram similarity (`pg_trgm`), as used for search.** A reasonable alternative that was not taken
here; soundex plus levenshtein encodes "sounds the same *and* is spelled almost the same", which is
the failure mode of hand-entered German names. Trigram scoring remains the mechanism for the search
box ([ADR-0025](0025-single-free-text-fuzzy-search.md)).

**Automatic merging above a confidence threshold.** Rejected outright: an incorrect automatic merge
destroys a household's record, and no threshold justifies that risk.

**Merge as "keep one, delete the other".** The previous behaviour and rejected: it silently discards
the losing household's persons, notes, documents and attendance history.

**Field conflicts resolved by value** (client sends the winning value). Rejected: it would let a
client write an arbitrary, unvalidated value through a path that deliberately skips validation.

## References

- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/modules/household/README.md`
- `modules/household/internal/HouseholdDuplicationService.kt`, `HouseholdMergeService.kt`,
  `HouseholdMergePlanner.kt`
- `db-migration/R__00031_duplication_detection.sql`, `R__00067_household_person_refactor.sql`
- `frontend/src/main/webapp/src/app/modules/customer/views/customer-merge/`
</content>
