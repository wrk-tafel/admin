# Database Migrations

Every script here is a Flyway *repeatable* migration (see CLAUDE.md, "Creating a New Database
Migration"), which carries one obligation beyond running once: it must also succeed if Flyway ever
re-runs it against a database that already reflects it. That happens whenever the file's checksum
changes - which is exactly what an edit does, cosmetic or not - so "never edit an already-released
migration" (CLAUDE.md) is the only thing standing between an innocuous-looking edit and a boot
failure on every environment that already applied the old content.

## Known non-re-runnable migrations

The following already-released migrations are **not** actually safe to re-run, but per the rule
above are not being edited just to add the missing guard - that would itself be the checksum change
that trips them. Fix these the next time either file is legitimately touched for another reason, and
remove its entry here (and from `RepeatableMigrationRerunSafetyTest.KNOWN_NON_RERUNNABLE_MIGRATIONS`)
once done - that test fails if a listed file starts passing without being removed from both places,
or if a migration outside this list stops being re-runnable.

- **`R__00106_employee_delete_set_null.sql`** - `alter table household_notes drop constraint
  customers_notes_employee_id_fkey` has no `if exists`. A re-run fails with `constraint ... does not
  exist` once the first run has already dropped it.
- **`R__00110_household_duplicate_dismissals_fk.sql`** - its two `add constraint ...` statements have
  no drop-first/guard (unlike sibling migrations that add similar constraints). A re-run fails with
  `duplicate_object`.
- **`R__00111_change_tracking_actor_user_fk.sql`** - only valid against the pre-migration schema; a
  re-run's `add column if not exists created_by_id` re-adds a column the original renamed away, and
  the following `update` fails on a type mismatch against the renamed/retyped column.

See issue #3632 for the full analysis of the three above.

A full-set replay (copy every script to a scratch schema, migrate once, then append a comment to
one script at a time and migrate again) turned up a further 31 migrations with the same problem -
see issue #3640. They fall into two groups:

### No guard against its own first run

Each of these statements' effect already happened the first time the file ran, so a checksum-changed
re-run repeats it and Postgres rejects the duplicate (or missing) target:

- **`R__00010_add_more_fields_to_distribution_table.sql`, `R__00054_add_notes_to_distribution.sql`,
  `R__00064_shelters_enabled.sql`, `R__00071_food_categories_enabled.sql`,
  `R__00079_cars_enabled_sortorder.sql`** - each does a plain `alter table ... add column ...` with
  no `if not exists`; a re-run fails with `column "..." already exists`. (`R__00079`'s own
  `sort_order` column two lines below the unguarded `enabled` one *is* guarded with
  `if not exists`, inconsistently within the same file.)
- **`R__00040_add_food_collections.sql`, `R__00057_added_notification_procedure.sql`** - each has an
  `add constraint ...` with no guard; a re-run fails with the constraint already existing.
- **`R__00033_cleanup_users.sql`** - its `drop column personnel_number`/`firstname`/`lastname` have
  no `if exists`; a re-run fails once the first run has already dropped them.
- **`R__00052_adapt_shelters.sql`** - `drop constraint distributions_statistics_shelters_name_key`
  has no `if exists`; same failure mode as `R__00033`, on a constraint instead of a column.
- **`R__00053_adapted_categories.sql`** - `rename column back to return_item` has no existence guard;
  the column is already renamed after the first run.

### Depends on an object a different, later migration renamed, retyped or dropped

Each of these was correct against the schema at the time it first ran, but a *different*, later
migration has since changed the object it reads or writes out from under it:

- **`R__00012_add_customer_notes.sql`, `R__00013_add_customer_distribution.sql`,
  `R__00020_migration_adaptions.sql`, `R__00021_cleanup_data.sql`,
  `R__00022_add_familybonus_field.sql`, `R__00027_user_distributions_fk_cascade.sql`,
  `R__00029_add_gender.sql`, `R__00030_cleanup_datamigration.sql`,
  `R__00031_duplication_detection.sql`, `R__00034_customers_employee.sql`,
  `R__00035_customers_notes_employee.sql`, `R__00036_cleanup_customers_user_id.sql`** - each reads
  or writes `customers`/`customers_addpersons`/`customers_notes` under their pre-refactor names.
  `R__00067` renames `customers_notes`→`household_notes` and
  `distributions_customers`→`distributions_households`, and `R__00068` drops `customers`/
  `customers_addpersons` outright - so a re-run of any of these fails with `relation "..." does not
  exist`.
- **`R__00032_add_employees.sql`, `R__00060_cost_contribution.sql`** - each calls
  `nextval('hibernate_sequence')`, which `R__00070` drops once every entity has its own per-table
  `<table>_seq` sequence (see CLAUDE.md, "Creating a New Database Migration").
- **`R__00003_static_values.sql`, `R__00008_static_values_2022.sql`,
  `R__00056_rework_income_limits.sql`** - read or write `static_values.count_adult`/`count_child`/
  `created_at`/`updated_at`. `R__00056` itself drops the whole `static_values` table at the end of
  its own run, and `R__00060` later reuses the name by renaming `static_income_limits` (with
  `count_adults`/`count_children` and no timestamp columns) into it - so by the time any of these
  three could re-run, the table under that name is not the one they expect.
- **`R__00045_add_car_table.sql`** - `alter column car_license_plate drop not null`; `R__00046` drops
  that column entirely.
- **`R__00066_statistics_performance_indexes.sql`** - `CREATE INDEX ... ON distributions
  (date(started_at))`. `R__00116` converts `started_at` to `timestamptz` and replaces the same-named
  index with one built on the immutable `vienna_date()` wrapper instead; re-creating it on `date()`
  then fails, since `date()` over a `timestamptz` depends on the session's timezone and Postgres
  rejects it as a non-`IMMUTABLE` index expression.
- **`R__00067_household_person_refactor.sql`** - its `insert into households (..., migrated,
  migration_date, ...)` targets columns `R__00090` later drops, and its source rows come from
  `customers`/`customers_addpersons`, which `R__00068` drops outright.
- **`R__00072_renumber_food_categories_sortorder.sql`** - `partition by return_item`, despite its own
  comment claiming the update is idempotent; `R__00084` drops `food_categories.return_item` once
  return-box categories move to their own table.

## Silently does the wrong thing instead of failing outright

`RepeatableMigrationRerunSafetyTest` only asserts on migrate() succeeding or failing, so it cannot
catch either of these - they both re-run "successfully" while quietly producing the wrong schema:

- **`CREATE OR REPLACE FUNCTION`/re-run ordering.** A later migration's `CREATE OR REPLACE FUNCTION`
  (e.g. `R__00099_dashboard_notify_every_change.sql`, `R__00101_statistics_timeline_bounds.sql`) only
  stays in effect because the earlier migration that first defined the same function
  (`R__00059_dashboard_add_notification_trigger.sql`, `R__00063_statistics_query_function.sql`)
  never runs again. Editing one of those **older** files for any reason changes its checksum, and
  Flyway re-runs only that file - reinstating its original (superseded) function body with no
  error, silently undoing the later fix. Never edit `R__00059`/`R__00063`; if the function needs to
  change again, add a new repeatable migration that replaces it, the same way `R__00099`/`R__00101`
  did.
- **`R__00004_customer_tables.sql`.** Its `create table if not exists customers (...)`/
  `customers_addpersons` no-ops harmlessly as long as those tables still exist, but once `R__00068`
  has dropped them for good, a re-run of `R__00004` silently *recreates them empty* instead of
  failing - the `if not exists` guard makes it "safe" in the narrow sense of not erroring, while
  actually resurrecting tables the rest of the schema (and the application) no longer expect to
  exist.
