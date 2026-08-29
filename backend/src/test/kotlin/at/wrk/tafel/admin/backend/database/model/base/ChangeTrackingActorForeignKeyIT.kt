package at.wrk.tafel.admin.backend.database.model.base

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.jdbc.core.JdbcTemplate
import java.time.LocalDateTime

/**
 * Issue #3426: `created_by`/`updated_by` (R__00092/R__00096/R__00102) are a nullable foreign key to
 * `users(id)` with `on delete set null` (`R__00111_change_tracking_actor_user_fk.sql`, ADR-0052), so
 * a deleted account's provenance clears itself instead of a bespoke sweep having to keep the table
 * list in sync by hand. A MockK-based unit test can't prove every table/column name the migration
 * references actually exists or that the constraint really cascades - only a real Postgres schema
 * can.
 */
internal class ChangeTrackingActorForeignKeyIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var jdbcTemplate: JdbcTemplate

    @Autowired
    private lateinit var userRepository: UserRepository

    companion object {
        // Mirrors R__00111_change_tracking_actor_user_fk.sql's own table list.
        private val TABLES_WITH_CHANGE_TRACKING_ACTOR = listOf(
            "cars",
            "distributions",
            "distributions_households",
            "distributions_statistics",
            "distributions_statistics_shelters",
            "employees",
            "food_categories",
            "food_collections",
            "food_return_categories",
            "household_documents",
            "household_notes",
            "households",
            "login_attempts",
            "persons",
            "push_preferences",
            "push_subscriptions",
            "push_type_preferences",
            "routes",
            "routes_stops",
            "shelters",
            "shelters_contacts",
            "shops",
            "users",
            "users_authorities",
            "routes_stops_completions",
            "household_duplicate_dismissals",
        )
    }

    @Test
    fun `every change-tracked table has created_by and updated_by as an on-delete-set-null foreign key to users`() {
        TABLES_WITH_CHANGE_TRACKING_ACTOR.forEach { table ->
            assertThat(deleteRuleForForeignKey(table, "created_by"))
                .withFailMessage("expected %s.created_by to be an ON DELETE SET NULL foreign key to users(id)", table)
                .isEqualTo("SET NULL")
            assertThat(deleteRuleForForeignKey(table, "updated_by"))
                .withFailMessage("expected %s.updated_by to be an ON DELETE SET NULL foreign key to users(id)", table)
                .isEqualTo("SET NULL")
        }
    }

    @Test
    fun `deleting a user clears created_by and updated_by wherever it was recorded as the actor`() {
        val actor = userRepository.saveAndFlush(testUserToDelete())
        val now = LocalDateTime.now()
        val loginAttemptId = System.nanoTime()
        insertLoginAttempt(id = loginAttemptId, username = "checked-by-fk-test", actorId = actor.id!!, at = now)

        userRepository.delete(actor)

        assertThat(actorsOfLoginAttempt(loginAttemptId)).isEqualTo(null to null)
    }

    private fun testUserToDelete(): UserEntity = UserEntity(
        username = "actor-to-delete-${System.nanoTime()}",
        password = "irrelevant",
        employee = EmployeeEntity(
            personnelNumber = "fk-test-${System.nanoTime()}",
            firstname = "Test",
            lastname = "Actor",
        ),
        enabled = true,
        passwordChangeRequired = false,
    )

    private fun insertLoginAttempt(id: Long, username: String, actorId: Long, at: LocalDateTime) {
        jdbcTemplate.update(
            """
                insert into login_attempts (id, created_at, updated_at, created_by, updated_by, username, last_failure_at)
                values (?, ?, ?, ?, ?, ?, ?)
            """.trimIndent(),
            id,
            at,
            at,
            actorId,
            actorId,
            username,
            at,
        )
    }

    private fun actorsOfLoginAttempt(id: Long): Pair<Long?, Long?> = jdbcTemplate.queryForObject(
        "select created_by, updated_by from login_attempts where id = ?",
        { rs, _ -> (rs.getObject("created_by") as Long?) to (rs.getObject("updated_by") as Long?) },
        id,
    )

    private fun deleteRuleForForeignKey(table: String, column: String): String? = jdbcTemplate.queryForList(
        """
            select rc.delete_rule
            from information_schema.key_column_usage kcu
            join information_schema.referential_constraints rc
              on rc.constraint_name = kcu.constraint_name and rc.constraint_schema = kcu.constraint_schema
            where kcu.table_name = ? and kcu.column_name = ?
        """.trimIndent(),
        String::class.java,
        table,
        column,
    ).singleOrNull()
}
