# ADR-0014: Integration tests run against a real PostgreSQL via Testcontainers

**Status:** accepted · **Recorded:** 2026-08-09

## Context

A large share of this application's behaviour lives in the database rather than above it:
Flyway-owned schema including triggers and extensions ([ADR-0004](0004-repeatable-only-flyway-migrations.md)),
advisory locks, `LISTEN`/`NOTIFY`, `pg_trgm` and `fuzzystrmatch` queries, per-table Hibernate
sequences, JPA specifications, and cascade/`orphanRemoval` semantics on the household/person graph
([ADR-0007](0007-household-person-model-with-customer-vocabulary-in-the-frontend.md)).

None of that is exercised by a unit test with a mocked repository. The failure modes are specific and
recurring: a missing `<table>_seq` fails at runtime with `relation "<table>_seq" does not exist`; a
new searchable column is silently unfindable until it is added to the `search_text` trigger; a merge
that touches a cascading collection deletes rows it meant to re-parent. Each of these passes a
green MockK test suite.

## Decision

**Integration tests extend `TafelBaseIntegrationTest`, which starts a real PostgreSQL of the
production version through Testcontainers.** Unit tests (`*Test.kt`) keep mocking collaborators;
integration tests (`*IT.kt`) run against the real thing, with the real migrations applied.

```kotlin
@SpringBootTest
@AutoConfigureTestEntityManager
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class TafelBaseIntegrationTest {
    companion object {
        private val postgreSQLContainer = PostgreSQLContainer("postgres:18-bookworm")
            /* ... */.apply { start() }

        @DynamicPropertySource
        @JvmStatic
        fun dynamicDataSourceProperties(registry: DynamicPropertyRegistry) { /* url/user/password */ }
    }
}
```

The container follows the **singleton container pattern**: started once for the whole JVM test run
and never stopped by JUnit, so it stays valid for every subclass.

## Consequences

- Migrations, triggers, extensions, sequences, locks and native SQL are all covered by the same tests
  that cover the Kotlin above them — including the class of bug that only appears when a request
  round-trips through a real backend.
- No developer has to have a database installed or seeded to run the tests; Docker is the only
  prerequisite, and everyone runs the same Postgres version as production.
- Integration tests are slower than unit tests and need a Docker daemon. That is why the split is
  kept explicit — most logic is still tested with mocks, and only what depends on the database gets
  an `*IT`.
- **`@Container`/`@Testcontainers` must not be used here.** Those stop the container after each test
  class, while Spring's `ApplicationContext` cache keeps reusing the now-stale datasource
  configuration for the next class — producing "connection refused" as soon as a second IT class
  runs. The singleton pattern above is deliberate, not a shortcut.
- The Postgres version is pinned in the base class and has to be moved in step with production.
- Frontend behaviour is the mirror image of the same argument and is covered by Cypress e2e rather
  than by unit specs alone; the repository treats an added/updated e2e case as part of any
  user-facing frontend change.

## Alternatives considered

**H2 or another in-memory database in Postgres compatibility mode.** Faster and dependency-free, and
rejected because it cannot run the parts that matter: `pg_trgm`, `fuzzystrmatch`, advisory locks,
`LISTEN`/`NOTIFY`, `jsonb`, and the migrations themselves. A test suite green against a database the
application never runs on is worse than no test — it is confidently wrong.

**A shared developer/CI database.** Rejected: shared mutable state between runs, ordering
dependencies, and per-developer setup that drifts.

**Mocked repositories only.** Rejected: that is exactly the configuration in which the recurring
failures listed above stay invisible until production.

## References

- `backend/src/test/kotlin/at/wrk/tafel/admin/backend/TafelBaseIntegrationTest.kt`
- `CLAUDE.md` — "Testing", "Creating a New Database Migration"
</content>
