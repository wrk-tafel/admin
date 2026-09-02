package at.wrk.tafel.admin.backend.database.config

import at.wrk.tafel.admin.backend.TEST_POSTGRES_IMAGE
import org.assertj.core.api.Assertions.assertThat
import org.flywaydb.core.Flyway
import org.junit.jupiter.api.Test
import org.testcontainers.postgresql.PostgreSQLContainer
import java.io.File
import java.nio.file.Files
import java.sql.DriverManager

/**
 * Every script in `db-migration` is a Flyway *repeatable* migration, which Flyway re-runs whenever
 * its checksum changes - i.e. whenever it is edited, cosmetic or not (see the module README). This
 * test is the CI check issue #3640 asked for: it replays the *entire* migration set, one file at a
 * time - reset schema, migrate the untouched set to build the "currently deployed" state, then
 * append a comment to just that one file and migrate again - so a migration that would only fail to
 * re-run once it is actually edited gets caught here first, not as a production boot failure.
 *
 * The schema reset before every file is what keeps each file's test isolated from every other
 * file's. Accumulating state across the whole loop instead would let one file's own successful
 * rerun (e.g. a `create table if not exists` for a table a later migration intentionally drops)
 * silently contaminate every later file's test - it would still succeed, just by resurrecting a
 * table nothing else expects to see any more, rather than by being genuinely safe to re-run in the
 * single-file-changed scenario a real deploy is.
 */
class RepeatableMigrationRerunSafetyTest {

    companion object {
        /**
         * Migrations already known not to survive a re-run (see the "Known non-re-runnable
         * migrations" section of `db-migration/README.md` for why each one fails). Per CLAUDE.md's
         * "never edit an already-released migration" rule, none of these can simply be patched in
         * place - each is fixed the next time it is legitimately touched for another reason, and
         * removed from this set (and the README) at the same time. A file that starts passing
         * without being removed here fails the second assertion below, so a stale entry can't go
         * unnoticed.
         */
        private val KNOWN_NON_RERUNNABLE_MIGRATIONS = setOf(
            "R__00003_static_values.sql",
            "R__00008_static_values_2022.sql",
            "R__00010_add_more_fields_to_distribution_table.sql",
            "R__00012_add_customer_notes.sql",
            "R__00013_add_customer_distribution.sql",
            "R__00020_migration_adaptions.sql",
            "R__00021_cleanup_data.sql",
            "R__00022_add_familybonus_field.sql",
            "R__00027_user_distributions_fk_cascade.sql",
            "R__00029_add_gender.sql",
            "R__00030_cleanup_datamigration.sql",
            "R__00031_duplication_detection.sql",
            "R__00032_add_employees.sql",
            "R__00033_cleanup_users.sql",
            "R__00034_customers_employee.sql",
            "R__00035_customers_notes_employee.sql",
            "R__00036_cleanup_customers_user_id.sql",
            "R__00040_add_food_collections.sql",
            "R__00045_add_car_table.sql",
            "R__00052_adapt_shelters.sql",
            "R__00053_adapted_categories.sql",
            "R__00054_add_notes_to_distribution.sql",
            "R__00056_rework_income_limits.sql",
            "R__00057_added_notification_procedure.sql",
            "R__00060_cost_contribution.sql",
            "R__00064_shelters_enabled.sql",
            "R__00066_statistics_performance_indexes.sql",
            "R__00067_household_person_refactor.sql",
            "R__00071_food_categories_enabled.sql",
            "R__00072_renumber_food_categories_sortorder.sql",
            "R__00079_cars_enabled_sortorder.sql",
            "R__00106_employee_delete_set_null.sql",
            "R__00110_household_duplicate_dismissals_fk.sql",
            "R__00111_change_tracking_actor_user_fk.sql",
        )
    }

    @Test
    fun `every repeatable migration is safe to re-run, except the documented known-bad ones`() {
        val sourceDir = File("src/main/resources/db-migration")
        val scratchDir = Files.createTempDirectory("migration-rerun-safety-it").toFile()
        val files = sourceDir.listFiles { f -> f.name.endsWith(".sql") }!!.sortedBy { it.name }
        files.forEach { it.copyTo(File(scratchDir, it.name)) }

        val container = PostgreSQLContainer(TEST_POSTGRES_IMAGE)
            .withDatabaseName("migration-rerun-safety")
            .withUsername("admin")
            .withPassword("admin")
        container.start()

        try {
            val flyway = Flyway.configure()
                .dataSource(container.jdbcUrl, container.username, container.password)
                .locations("filesystem:${scratchDir.absolutePath}")
                .group(true)
                .ignoreMigrationPatterns("*:missing")
                .load()

            val unexpectedFailures = mutableListOf<String>()
            val unexpectedSuccesses = mutableListOf<String>()

            for (file in scratchDir.listFiles { f -> f.name.endsWith(".sql") }!!.sortedBy { it.name }) {
                resetSchema(container)
                flyway.migrate()

                val original = file.readText()
                file.writeText("$original\n-- rerun-safety-it probe\n")
                val expectedToFail = file.name in KNOWN_NON_RERUNNABLE_MIGRATIONS
                try {
                    flyway.migrate()
                    if (expectedToFail) unexpectedSuccesses.add(file.name)
                } catch (e: Exception) {
                    if (!expectedToFail) unexpectedFailures.add("${file.name}: ${e.message}")
                } finally {
                    file.writeText(original)
                }
            }

            assertThat(unexpectedFailures)
                .`as`(
                    "migrations that fail to re-run but aren't in KNOWN_NON_RERUNNABLE_MIGRATIONS - " +
                        "add a guard (if exists/if not exists) the next time the file is legitimately " +
                        "touched, or document it in the README and KNOWN_NON_RERUNNABLE_MIGRATIONS if it " +
                        "can't be fixed without editing an already-released migration",
                )
                .isEmpty()
            assertThat(unexpectedSuccesses)
                .`as`(
                    "migrations listed in KNOWN_NON_RERUNNABLE_MIGRATIONS that are actually safe to " +
                        "re-run now - remove them from this set and from the README's " +
                        "\"Known non-re-runnable migrations\" section",
                )
                .isEmpty()
        } finally {
            container.stop()
        }
    }

    private fun resetSchema(container: PostgreSQLContainer) {
        DriverManager.getConnection(container.jdbcUrl, container.username, container.password).use { conn ->
            conn.createStatement().use { st ->
                st.execute("drop schema public cascade; create schema public;")
            }
        }
    }
}
