package at.wrk.tafel.admin.backend.database.config

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxEntity
import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.jdbc.core.JdbcTemplate
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.ZoneOffset

/**
 * Pins down R__00116's `timestamp` -> `timestamptz` conversion (ADR-0054) against a real Postgres,
 * which a MockK-based unit test cannot see: it can only prove which value was passed to a mocked
 * repository, not what Postgres actually stored or how pgjdbc converted it back.
 */
internal class TimestampTimezoneConversionIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var sseOutboxRepository: SseOutboxRepository

    @Autowired
    private lateinit var jdbcTemplate: JdbcTemplate

    @Test
    fun `event timestamp columns are timestamptz, flyway_schema_history and shedlock are not`() {
        val convertedColumns = setOf(
            "users" to "created_at",
            "households" to "locked_at",
            "distributions" to "started_at",
            "audit_log" to "occurred_at",
            "sse_outbox" to "event_time",
        )
        convertedColumns.forEach { (table, column) ->
            assertThat(columnDataType(table, column))
                .`as`("%s.%s", table, column)
                .isEqualTo("timestamp with time zone")
        }

        val excludedColumns = setOf(
            "flyway_schema_history" to "installed_on",
            "shedlock" to "lock_until",
            "shedlock" to "locked_at",
        )
        excludedColumns.forEach { (table, column) ->
            assertThat(columnDataType(table, column))
                .`as`("%s.%s", table, column)
                .isEqualTo("timestamp without time zone")
        }
    }

    @Test
    fun `distributions started_at is still indexed by its Vienna calendar date, via the immutable vienna_date wrapper`() {
        val indexDefinition = jdbcTemplate.queryForObject(
            "SELECT indexdef FROM pg_indexes WHERE indexname = 'idx_distributions_started_at_date'",
            String::class.java,
        )

        assertThat(indexDefinition).contains("vienna_date(started_at)")
    }

    @Test
    fun `a LocalDateTime written through JPA round-trips to the identical Vienna wall-clock value`() {
        // The JVM under test runs with -Duser.timezone=Europe/Vienna too (see build.gradle.kts), so
        // this is genuinely Vienna wall-clock time, the same as production.
        val viennaWallClockTime = LocalDateTime.of(2026, 8, 30, 14, 30, 0)

        val saved = sseOutboxRepository.save(
            SseOutboxEntity().apply {
                eventTime = viennaWallClockTime
                notificationName = "timezone-conversion-it"
            },
        )

        val reloaded = sseOutboxRepository.findById(saved.id!!).orElseThrow()

        assertThat(reloaded.eventTime).isEqualTo(viennaWallClockTime)
    }

    @Test
    fun `the value stored on disk is the correct UTC instant, not the naive Vienna wall-clock string`() {
        val viennaWallClockTime = LocalDateTime.of(2026, 8, 30, 14, 30, 0)
        val expectedUtcInstant = viennaWallClockTime.atZone(ZoneId.of("Europe/Vienna"))
            .withZoneSameInstant(ZoneOffset.UTC)
            .toLocalDateTime()

        val saved = sseOutboxRepository.save(
            SseOutboxEntity().apply {
                eventTime = viennaWallClockTime
                notificationName = "timezone-conversion-it-utc"
            },
        )

        val storedAsUtc = jdbcTemplate.queryForObject(
            "SELECT event_time AT TIME ZONE 'UTC' FROM sse_outbox WHERE id = ?",
            LocalDateTime::class.java,
            saved.id,
        )

        assertThat(storedAsUtc).isEqualTo(expectedUtcInstant)
    }

    private fun columnDataType(table: String, column: String): String? = jdbcTemplate.queryForObject(
        """
            SELECT data_type FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = ? AND column_name = ?
        """,
        String::class.java,
        table,
        column,
    )
}
