# ADR-0060: Users and employees are separate records with no link between them

**Status:** accepted · **Recorded:** 2026-09-26

## Context

A user (a login account) and an employee (a person referenced by a food collection as its driver or
co-driver) were the same person seen from two sides. `users.employee_id` was `NOT NULL` and pointed at
the employee, and the account had no name or personnel number of its own - both lived on `employees`
only (`R__00033_cleanup_users.sql`). Everything that needed the acting person went through that link:
`HouseholdEntity.issuer`, a household note's author and a route stop's recorder were all set from
`UserEntity.employee`.

That had costs that showed up in daily use (issue #3740):

- The user form did not take a name, it took a personnel number and resolved it to an employee. Editing
  the name of an account silently rewrote the employee record, and changing the personnel number
  re-linked the account to a different employee and overwrote *that* one's name.
- An employee with an account could not be deleted, and deleting the account left the employee behind
  for up to seven years (`EmployeeRetentionService`) unless it went through the Datenauskunft screen,
  which had a separate rule for "delete the linked employee too" (`deleteUserAndLinkedEmployee`).
- The link was never one-to-one in the schema: nothing made `users.employee_id` unique, so the
  application enforced it and several code paths carried a special case for "a pre-existing duplicate
  link".
- The employee export and the Datenauskunft search each had to know about accounts, to refuse or filter
  the employees an account already covered.

## Decision

**A user owns its personnel number, first name and last name. An employee is only a driver or co-driver.
Nothing links the two, and the same person may exist in both, entered twice on purpose.**

- `users` carries `personnel_number`, `firstname` and `lastname` (`R__00125_split_users_and_employees.sql`);
  `users.employee_id` is gone. `UserEntity` takes the three fields directly, and `TafelUserDetailsManager`
  writes them without touching `employees`.
- What used to reach the acting person through the link now points at the user: `households.issuer_user_id`,
  `household_notes.author_user_id` and `routes_stops_completions.completed_by_user_id`, each a foreign key to
  `users(id)` with `on delete set null` - the behavior the employee reference had. Deleting an account clears
  them and the screens show "Mitarbeiter gelöscht", as they did for a deleted employee. `created_by`/
  `updated_by` already worked this way ([ADR-0052](0052-change-tracking-actor-becomes-a-foreign-key.md)).
- `employees` is referenced only by `food_collections` (`driver_employee_id`, `co_driver_employee_id`), which
  are `on delete set null` as well. Deleting an employee therefore always succeeds, and the employee export
  never refuses. `EmployeeRetentionService` deletes an employee once no food collection has named them as driver or co-driver
  for the retention window (or, for one never used, since it was created).
- The Datenauskunft screen lists employees like any other match (`DataSubjectMatchType.EMPLOYEE`), and
  erasing a user account deletes the account and nothing else.
- `users.search_text` is built from the user's own columns; the trigger on `employees` that used to refresh it
  is dropped.

## Consequences

- The migration copies each account's identity from its employee and re-points the three references through
  `users.employee_id` while that column still exists. A household issuer, note author or route stop recorder
  whose employee has **no** account cannot be carried over - there is no account to point at - and is shown as
  "Mitarbeiter gelöscht" afterwards. That is the same result as deleting that employee, which was always
  allowed, but it is a one-time loss of attribution on existing data.
- The employees that used to back accounts stay behind as ordinary employees and appear in the Mitarbeiter
  list and the driver search. Nothing deletes them at once; `EmployeeRetentionService` removes one that has gone unused for
  its retention window, and an administrator may delete them by hand.
- A person who is both a user and a driver is entered twice, and a name change has to be made in both places.
  That is the price of the split and the reason it was chosen: no code has to decide which record wins.
- A note is editable only by the account that wrote it, where it used to be the employee behind the account.
  Relinking an account to another employee no longer moves note ownership, since there is nothing to relink.
- Personnel numbers are unique among users (checked by `UserController`, as before) and among employees
  (`employees.personnel_number` is `unique`), but not across the two.
- `HouseholdEntity`, `HouseholdNoteEntity` and `RouteStopCompletionEntity` now depend on `UserEntity`. That is
  the ambient shared entity layer ([ADR-0001](0001-modular-monolith-with-spring-modulith.md)); `lockedBy` already
  did.

## Alternatives considered

- **Keep the link, fix the symptoms.** Delete the account's employee together with it, and let an employee
  with an account be deleted along with the account. This keeps one source of truth for a person's name, but
  keeps every rule that exists to guard the link (uniqueness, the re-linking overwrite, the export refusal, the
  search filter), and leaves the user form resolving a personnel number instead of asking for a name.
- **Nullable link.** Make `users.employee_id` optional and let an account carry its own name only when it has no
  employee. Two places for the same field and a rule for which one wins is the complexity this decision removes.
- **Snapshot the issuer's name on the household** instead of pointing at the user. It would keep the
  attribution of a deleted account, which is exactly what the erasure of a staff member's data (GDPR Art. 17)
  should not keep.

## References

- Issue #3740
- `backend/src/main/resources/db-migration/R__00125_split_users_and_employees.sql`
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/database/model/auth/UserEntity.kt`
- `backend/src/main/kotlin/at/wrk/tafel/admin/backend/modules/base/README.md`
- `docs/architecture/gdpr-compliance.md`, gap G13
