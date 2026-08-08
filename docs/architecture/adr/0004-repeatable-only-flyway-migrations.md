# ADR-0004: Repeatable-only Flyway migrations, never edited once released

**Status:** accepted · **Recorded:** 2026-08-09

## Context

The schema is owned by Flyway, not by Hibernate: `ddl-auto` is unset, so nothing is generated at
startup and every table, index, trigger and extension exists because a migration created it.
Migrations run on application boot, which means a deploy and a schema change are the same event
(this is also what makes [ADR-0013](0013-saturday-production-deploy-freeze.md) necessary).

Flyway offers two kinds of script: versioned (`V1__`, applied once, checksum-locked) and repeatable
(`R__`, re-applied whenever their checksum changes). The repository has grown past 90 scripts under
`backend/src/main/resources/db-migration/`, and every one of them is repeatable.

## Decision

**All migrations are repeatable scripts named `R__XXXXX_<description>.sql`, written to be safely
re-runnable, and a script that has been released is never edited again.**

Concretely:

- A new migration takes the next free five-digit number and uses `if not exists` / `create or
  replace` / idempotent `update` statements throughout, so re-running it is a no-op.
- Undoing something an old migration did means **adding** a new migration that undoes it — for
  example `R__00087_drop_persons_in_shelter_count.sql` dropping a column that `R__00044` added. The
  old file stays byte-for-byte untouched, including when the edit would be purely cosmetic.
- The one exception is a migration added on the current branch that has not been merged or released
  yet; that one is still the author's to change.
- Any new entity table also needs its own `<table>_seq` sequence in the same migration, because
  Hibernate's `id.db_structure_naming_strategy` is `standard` here (`R__00070_migrate_id_sequences.sql`).
- `flyway.clean` is disabled outside the `testdata`/`e2e` profiles, `baseline-on-migrate` is on, and
  `ignore-migration-patterns: "*:missing"` tolerates scripts that no longer exist.

## Consequences

- Every script must be written idempotently. That is a real authoring constraint and the price of
  the model: a plain `alter table ... add column` is a bug here, not a shortcut.
- **Editing a released migration breaks production.** Its checksum changes, Flyway re-runs it against
  a schema that has since moved on, the statements fail, and the application does not boot. This is
  the single sharpest edge in the repository and the reason the rule is stated so absolutely — it
  holds even for reformatting or fixing a comment.
- History is append-only and therefore honest: the file list *is* the sequence of schema decisions,
  and a squashed "tidy-up" of old scripts is not available as an option.
- Flyway applies repeatable scripts in description order, i.e. by filename — which is why the
  numeric prefix matters even though Flyway does not read it as a version — and `group: true` runs
  the whole pending batch in a single transaction.
- Correctness of a migration cannot be established by unit tests with a mocked repository. Only a
  real Postgres run — an `*IT.kt` test via `TafelBaseIntegrationTest`
  ([ADR-0014](0014-integration-tests-against-real-postgres.md)) or a manual run — exercises it. A
  missing `<table>_seq` in particular surfaces only at runtime, as
  `relation "<table>_seq" does not exist`.

## Alternatives considered

**Versioned migrations (`V__`), the Flyway default.** The conventional choice, and it would remove
the idempotency requirement. Rejected in practice because the codebase is already fully committed to
the repeatable convention across 90+ scripts; converting would rewrite the applied-migration history
of every existing database for no behavioural gain. The protection versioned scripts give against
editing history is instead supplied by the "never edit a released migration" rule.

**Hibernate `ddl-auto: update`.** Rejected outright: no review of what runs against production, no
way to express data migrations, triggers or extensions, and no reproducible order.

**A migration tool with undo/rollback scripts.** Rejected: forward-only fixes are simpler to reason
about than a rollback path that is written but never rehearsed.

## References

- `backend/src/main/resources/db-migration/`
- `backend/src/main/resources/application.yml` — the `spring.flyway` block
- `CLAUDE.md` — "Creating a New Database Migration"
- `R__00070_migrate_id_sequences.sql`, `R__00087_drop_persons_in_shelter_count.sql`
</content>
