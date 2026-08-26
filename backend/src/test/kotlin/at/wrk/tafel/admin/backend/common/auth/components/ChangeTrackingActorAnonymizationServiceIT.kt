package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatCode
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.jdbc.core.JdbcTemplate
import java.time.LocalDateTime

/**
 * Runs [ChangeTrackingActorAnonymizationService] against a real Postgres schema - a MockK-based unit
 * test would only prove which SQL string was built, not that every table/column name it references
 * actually exists (issue #3426's fix touches every table `R__00092`/`R__00096`/`R__00102` added
 * `created_by`/`updated_by` to).
 */
internal class ChangeTrackingActorAnonymizationServiceIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var changeTrackingActorAnonymizationService: ChangeTrackingActorAnonymizationService

    @Autowired
    private lateinit var jdbcTemplate: JdbcTemplate

    @Test
    fun `anonymize runs against every table without a schema mismatch`() {
        // No matching rows anywhere - this only has to prove that every table and column name the
        // service references actually exists, which a wrong one would fail loudly on.
        assertThatCode { changeTrackingActorAnonymizationService.anonymize("no-such-username") }
            .doesNotThrowAnyException()
    }

    @Test
    fun `anonymize replaces the deleted account's username and leaves other actors untouched`() {
        val deletedUsername = "deleted-user-${System.nanoTime()}"
        val otherUsername = "other-user-${System.nanoTime()}"
        val now = LocalDateTime.now()

        insertLoginAttempt(id = 1, username = "row-created-by-deleted-user", createdBy = deletedUsername, updatedBy = deletedUsername, at = now)
        insertLoginAttempt(id = 2, username = "row-created-by-other-user", createdBy = otherUsername, updatedBy = otherUsername, at = now)

        changeTrackingActorAnonymizationService.anonymize(deletedUsername)

        assertThat(actorsOf(id = 1)).isEqualTo(
            ChangeTrackingActorAnonymizationService.ANONYMIZED_ACTOR to ChangeTrackingActorAnonymizationService.ANONYMIZED_ACTOR,
        )
        assertThat(actorsOf(id = 2)).isEqualTo(otherUsername to otherUsername)
    }

    private fun insertLoginAttempt(id: Long, username: String, createdBy: String, updatedBy: String, at: LocalDateTime) {
        jdbcTemplate.update(
            """
                insert into login_attempts (id, created_at, updated_at, created_by, updated_by, username, last_failure_at)
                values (?, ?, ?, ?, ?, ?, ?)
            """.trimIndent(),
            id,
            at,
            at,
            createdBy,
            updatedBy,
            username,
            at,
        )
    }

    private fun actorsOf(id: Long): Pair<String?, String?> = jdbcTemplate.queryForObject(
        "select created_by, updated_by from login_attempts where id = ?",
        { rs, _ -> rs.getString("created_by") to rs.getString("updated_by") },
        id,
    )!!
}
