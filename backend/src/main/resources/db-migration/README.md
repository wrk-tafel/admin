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
remove its entry here once done:

- **`R__00106_employee_delete_set_null.sql`** - `alter table household_notes drop constraint
  customers_notes_employee_id_fkey` has no `if exists`. A re-run fails with `constraint ... does not
  exist` once the first run has already dropped it.
- **`R__00110_household_duplicate_dismissals_fk.sql`** - its two `add constraint ...` statements have
  no drop-first/guard (unlike sibling migrations that add similar constraints). A re-run fails with
  `duplicate_object`.
- **`R__00111_change_tracking_actor_user_fk.sql`** - only valid against the pre-migration schema; a
  re-run's `add column if not exists created_by_id` re-adds a column the original renamed away, and
  the following `update` fails on a type mismatch against the renamed/retyped column.

See issue #3632 for the full analysis of each.

## `CREATE OR REPLACE FUNCTION`/re-run ordering hazard

A later migration's `CREATE OR REPLACE FUNCTION` (e.g. `R__00099_dashboard_notify_every_change.sql`,
`R__00101_statistics_timeline_bounds.sql`) only stays in effect because the earlier migration that
first defined the same function (`R__00059_dashboard_add_notification_trigger.sql`,
`R__00063_statistics_query_function.sql`) never runs again. Editing one of those **older** files for
any reason changes its checksum, and Flyway re-runs only that file - reinstating its original
(superseded) function body with no error, silently undoing the later fix. Never edit
`R__00059`/`R__00063`; if the function needs to change again, add a new repeatable migration that
replaces it, the same way `R__00099`/`R__00101` did.
