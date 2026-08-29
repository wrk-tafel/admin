# ADR-0051: Data-subject requests search across areas, then delegate to each area's own export/delete

**Status:** accepted · **Recorded:** 2026-08-27

## Context

This application holds personal data about three different kinds of people: customers
(households), staff with a `users` account, and staff who are only ever referenced as an
`employees` row (a driver/co-driver who never logs in). Answering a GDPR Art. 15/17/20 request
("what do you have on me" / "delete what you have on me") means finding out which of the three a
requester is — and a real request doesn't arrive pre-labelled with that. Before this decision,
answering one meant guessing, then navigating three different screens under three different
permissions (`CUSTOMER`, `USER_MANAGEMENT`, `SETTINGS`), then manually combining downloads by hand
for someone who is both a customer and a volunteer.

Each area had already independently grown its own export (issues #3179, #3363, #3394 —
`HouseholdExportService`, `UserExportService`, `EmployeeExportService`) and, for households and
staff accounts, its own delete (`HouseholdService.deleteHouseholdByHouseholdId`,
`EmployeeService.deleteEmployee`) — see `docs/architecture/gdpr-compliance.md`'s G5, G12 and G14.
The design question this ADR settles (issue #3396, GDPR gap G15) was how to give those three a
single entry point without rebuilding what each already does correctly.

## Decision

**One search screen finds a data subject across all three areas; export and delete both delegate to
that area's own existing service through a thin cross-module facade, rather than a new pipeline.**

- `DataSubjectRequestController`/`DataSubjectRequestService` expose one search box over `households`,
  `users` and `employees` — reusing `SearchTextSpecs`'s trigram search for the first two and the
  Mitarbeiter screen's own `findBySearchInput` for the third, filtered to exclude an employee already
  covered by an existing `users` row (the same refusal `EmployeeExportService` itself enforces).
  Results are grouped by which of the three areas each match belongs to.
- Cross-module access goes through `HouseholdDataSubjectFacade`/`EmployeeDataSubjectFacade` — Spring
  Modulith never exposes an `.internal` type across a module boundary, named interface or not, so a
  thin facade is what lets `datasubjectrequest` call into `household`'s and `base::employee`'s
  existing services without reaching into their internals. `user`'s export/delete needed no facade:
  `UserExportService`/`TafelUserDetailsManager` already live outside an `.internal` package.
- **Export** of one or more selected matches always returns one combined ZIP: a household's own
  export unpacked into a `kunde-<id>/` folder, a user's or employee's PDF added under its own folder
  — so a person who is both a customer and a staff member, selected together, comes back as one
  archive instead of two separate downloads.
- **Delete** runs per match independently, unlike export — `DataSubjectDeleteResultItem` reports
  `DELETED`/`NOT_FOUND` per match rather than one pass/fail for the whole request, because two
  unrelated records failing together would be a worse outcome than one of them simply staying.
  Deletion reuses `HouseholdService.deleteHouseholdByHouseholdId`, `EmployeeService.deleteEmployee`
  and a new `TafelUserDetailsManager.deleteUserById` — re-checking the same "keep at least one active
  administrator" guard `UserController.deleteUser` already enforces, since this is a second caller of
  it that must not bypass it.
- **Permission model: additive, not a replacement.** A new `DATA_SUBJECT_REQUESTS` permission only
  grants reaching the search screen and picking a match — the export/delete action on a specific
  match still requires that area's own permission (`CUSTOMER`/`USER_MANAGEMENT`/`SETTINGS`), checked
  again inside `DataSubjectRequestService` since the class-level `@PreAuthorize` alone can't express a
  check that depends on which match a request body names. Today's screens keep meaning what they
  already meant; `DATA_SUBJECT_REQUESTS` doesn't become a fourth way to reach the same data on its
  own.
- **Scope stays per-area.** Each export covers personal data *about* that subject — the household and
  its persons, the user's own account fields, the employee's own master data — not every row that
  merely references them (a household a staff member issued, a note they authored, a food collection
  they drove). Those rows are substantively the *other* subject's data with the staff member's name
  attached only as attribution, the same reasoning that already excludes `audit_log` entries below.
- **No new audit mechanism.** Each export is recorded with the existing `AuditOperation.READ` value
  (added by G6/#3180) via `AuditLogWriter.record` at the point where that area's service reads the
  record, not a new synthetic "export" operation and not a separate entry for the search itself — the
  search is a lookup, not a disclosure of the record's contents.

## Consequences

- A person who is both a customer and a staff member gets one archive, not two — the reason this ADR
  exists.
- Two permissions are now involved in reaching one action: `DATA_SUBJECT_REQUESTS` to find and select
  a match, and that area's own permission to actually export or delete it. Whoever administers users
  has to keep granting both deliberately; there's no code path that derives one from the other, the
  same trade-off ADR-0050 already accepted for `CUSTOMER`/`CUSTOMER_DOCUMENTS`.
- No duplicated erasure or export logic to keep in sync — a change to what "a household's whole
  record" means only has to happen in `HouseholdExportService`, and this screen picks it up for free.
- `audit_log` entries about the subject stay excluded from every export here (household, user,
  employee, and this combined search-result export alike). This is a genuinely open question, not an
  oversight — folding audit history for a household into an endpoint gated only by `CUSTOMER` would
  let anyone who can open a household also read the names of every employee who ever edited it, which
  today needs the separate `AUDIT_LOG` permission. Still unanswered; see
  `docs/architecture/gdpr-compliance.md` §6 (issue #3185).
- The search itself caps at 20 best matches per area — a lookup for one specific person, not a report
  — and nothing signals if a match is silently dropped past that cap.

## Alternatives considered

**A single pipeline owning export/delete logic outright, instead of three facades calling into each
area's own service.** Rejected: it would duplicate logic each module already gets right (what counts
as "the whole record", how a household or employee is actually deleted), and would mean the
`datasubjectrequest` module reaching into `household`'s and `base::employee`'s internals the wrong
way — the opposite of the module-boundary model this application already commits to
([ADR-0001](0001-modular-monolith-with-spring-modulith.md)).

**A single permission covering the whole Datenauskunft screen, replacing the three area permissions.**
Rejected: it would let anyone holding it read or delete any household, user or employee even without
`CUSTOMER`/`USER_MANAGEMENT`/`SETTINGS` — widening access rather than consolidating an existing one.
Additive keeps every existing screen's permission meaning exactly what it already meant.

**Auditing the search step itself, not just the resulting export/delete.** Rejected for now: a search
match is a name and an id, not a disclosure of the record's contents, and every actual read of the
record is already covered by the per-entity `AuditOperation.READ` mechanism G6 built. Revisit if the
search result itself is ever judged sensitive enough on its own (e.g. it started returning more than
a name/id).

## References

- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/modules/datasubjectrequest/`
  (`DataSubjectRequestController`, `DataSubjectRequestService`)
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/modules/household/HouseholdDataSubjectFacade.kt`,
  `backend/src/main/kotlin/at/wrk/tafel/admin/backend/modules/base/employee/EmployeeDataSubjectFacade.kt`
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/modules/household/internal/HouseholdExportService.kt`,
  `backend/src/main/kotlin/at/wrk/tafel/admin/backend/common/auth/components/UserExportService.kt`,
  `backend/src/main/kotlin/at/wrk/tafel/admin/backend/modules/base/employee/internal/EmployeeExportService.kt`
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/common/auth/model/UserPermissions.kt` —
  `DATA_SUBJECT_REQUESTS`
- `docs/architecture/gdpr-compliance.md` — G5, G6, G12, G14, G15
- [ADR-0001](0001-modular-monolith-with-spring-modulith.md) — module boundaries
- [ADR-0050](0050-customer-documents-split-into-its-own-permission.md) — the same
  additive-permission trade-off for a narrower slice of one area
- [#3179](https://github.com/wrk-tafel/admin/issues/3179), [#3363](https://github.com/wrk-tafel/admin/issues/3363),
  [#3394](https://github.com/wrk-tafel/admin/issues/3394), [#3396](https://github.com/wrk-tafel/admin/issues/3396),
  [#3362](https://github.com/wrk-tafel/admin/issues/3362) — the issue this whole design traces back to
