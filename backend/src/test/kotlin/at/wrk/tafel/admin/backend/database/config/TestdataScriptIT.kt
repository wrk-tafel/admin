package at.wrk.tafel.admin.backend.database.config

import org.assertj.core.api.Assertions.assertThat
import org.flywaydb.core.Flyway
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.flyway.autoconfigure.FlywayMigrationStrategy
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.testcontainers.postgresql.PostgreSQLContainer

/**
 * Boots the application the way the `testdata` and `e2e` profiles do: [FlywayConfig] cleans, Flyway
 * migrates, and [FlywayImportTestdataCallback] imports `testdata.sql` on `AFTER_MIGRATE`.
 *
 * This is deliberately a test *of the cycle*, not of any particular row the script writes. Its whole
 * job is to answer "does clean + migrate + import still work" - if a migration adds a column,
 * constraint or table the 250-odd statements in `testdata.sql` no longer satisfy, the import throws,
 * the context never starts, and this test fails. Nothing else covers that: the shared
 * [at.wrk.tafel.admin.backend.TafelBaseIntegrationTest] container never imports the script, so such
 * a break otherwise only surfaces when a deployed environment refuses to boot.
 *
 * Runs on its own container on purpose - the import wipes and repopulates the schema, which would
 * pull the ground out from under every test sharing the singleton one.
 */
@SpringBootTest(
    properties = [
        "tafeladmin.testdata.enabled=true",
        "spring.flyway.locations=classpath:/db-migration,classpath:/db-migration-testdata",
    ],
)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class TestdataScriptIT {

    companion object {
        private val postgreSQLContainer: PostgreSQLContainer = PostgreSQLContainer("postgres:18.4-bookworm")
            .withDatabaseName("tafeladmin-testdata")
            .withUsername("admin")
            .withPassword("admin")
            .apply { start() }

        @DynamicPropertySource
        @JvmStatic
        fun dynamicDataSourceProperties(registry: DynamicPropertyRegistry) {
            registry.add("spring.datasource.url", postgreSQLContainer::getJdbcUrl)
            registry.add("spring.datasource.username", postgreSQLContainer::getUsername)
            registry.add("spring.datasource.password", postgreSQLContainer::getPassword)
        }
    }

    @Autowired
    private lateinit var jdbcTemplate: JdbcTemplate

    @Autowired
    private lateinit var flyway: Flyway

    @Autowired
    private lateinit var flywayMigrationStrategy: FlywayMigrationStrategy

    /**
     * Counts the tables the import left data in, without naming any of them - the point is that the
     * script populated the schema broadly, not which rows it wrote.
     */
    private fun populatedTableCount(): Int = jdbcTemplate.queryForObject(
        """
        SELECT COUNT(*)
        FROM (SELECT (xpath('/row/c/text()',
                            query_to_xml(format('SELECT COUNT(*) AS c FROM %I.%I', table_schema, table_name),
                                         false, true, '')))[1]::text::bigint AS row_count
              FROM information_schema.tables
              WHERE table_schema = 'public'
                AND table_type = 'BASE TABLE'
                AND table_name <> 'flyway_schema_history') counted
        WHERE row_count > 0
        """.trimIndent(),
        Int::class.java,
    )!!

    @Test
    fun `the testdata import populates the schema`() {
        assertThat(populatedTableCount()).isPositive()
    }

    /**
     * Every restart of a testdata environment repeats the cycle against a schema that is already
     * full, so `clean()` has to actually wipe it: the script inserts fixed primary keys, and a clean
     * that silently did nothing would make the second import die on duplicate keys rather than
     * reproduce the same state.
     */
    @Test
    fun `the clean and import cycle can run again over an already populated schema`() {
        val populatedTablesAfterStartup = populatedTableCount()
        assertThat(populatedTablesAfterStartup).isPositive()

        flywayMigrationStrategy.migrate(flyway)

        assertThat(populatedTableCount()).isEqualTo(populatedTablesAfterStartup)
    }
}
