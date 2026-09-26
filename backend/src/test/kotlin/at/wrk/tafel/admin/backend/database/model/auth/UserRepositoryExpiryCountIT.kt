package at.wrk.tafel.admin.backend.database.model.auth

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.auth.model.UserPermissions
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.data.domain.PageRequest
import org.springframework.jdbc.core.JdbcTemplate
import java.time.LocalDateTime

/**
 * `UserRepository.countUsersLastActiveBefore` against a real database - the native query behind the
 * administrators' advance warning (`RetentionExpiryReminderService`), which has to agree with what
 * `findExpiredUserIdsSkipLocked` will delete. Every fixture is dated to 1990 and counted against a
 * 1995 cutoff, so no other IT class's rows (dated 2000 and later) are ever included: the users table
 * is shared by the whole run.
 */
class UserRepositoryExpiryCountIT : TafelBaseIntegrationTest() {

    private companion object {
        val LONG_AGO: LocalDateTime = LocalDateTime.of(1990, 1, 1, 0, 0)
        val CUTOFF: LocalDateTime = LocalDateTime.of(1995, 1, 1, 0, 0)
        val RECENT: LocalDateTime = LocalDateTime.of(2999, 1, 1, 0, 0)
        var fixtureCounter = 0
    }

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var jdbcTemplate: JdbcTemplate

    @Test
    fun `counts accounts by last login, falling back to the creation date, and never an administrator`() {
        val before = userRepository.countUsersLastActiveBefore(CUTOFF, UserPermissions.ADMINISTRATOR.key)

        givenUser(lastLogin = LONG_AGO)
        givenUser(lastLogin = null, createdAt = LONG_AGO)
        givenUser(lastLogin = RECENT)
        givenUser(lastLogin = null, createdAt = RECENT)
        givenUser(lastLogin = LONG_AGO, administrator = true)

        val after = userRepository.countUsersLastActiveBefore(CUTOFF, UserPermissions.ADMINISTRATOR.key)

        // the two unused accounts count; the two recently active ones and the administrator do not
        assertThat(after - before).isEqualTo(2)
    }

    @Test
    fun `agrees with the candidates the retention job would claim`() {
        val expired = givenUser(lastLogin = LONG_AGO)

        assertThat(userRepository.findExpiredUserIdsSkipLocked(CUTOFF, UserPermissions.ADMINISTRATOR.key)).contains(expired)
        assertThat(userRepository.countUsersLastActiveBefore(CUTOFF, UserPermissions.ADMINISTRATOR.key))
            .isEqualTo(userRepository.findExpiredUserIdsSkipLocked(CUTOFF, UserPermissions.ADMINISTRATOR.key).size.toLong())
    }

    @Test
    fun `lists the accounts behind the count, longest unused first, and never an administrator`() {
        val oldest = givenUser(lastLogin = LocalDateTime.of(1990, 1, 1, 0, 0))
        val older = givenUser(lastLogin = null, createdAt = LocalDateTime.of(1991, 1, 1, 0, 0))
        val administrator = givenUser(lastLogin = LONG_AGO, administrator = true)
        val recent = givenUser(lastLogin = RECENT)

        val listed = userRepository.findUsersLastActiveBefore(CUTOFF, UserPermissions.ADMINISTRATOR.key, PageRequest.of(0, 1000)).map { it.id }

        assertThat(listed).contains(oldest, older)
        assertThat(listed).doesNotContain(administrator, recent)
        assertThat(listed.indexOf(oldest)).isLessThan(listed.indexOf(older))
    }

    @Test
    fun `caps the list at the requested page size`() {
        givenUser(lastLogin = LONG_AGO)
        givenUser(lastLogin = LONG_AGO)

        assertThat(userRepository.findUsersLastActiveBefore(CUTOFF, UserPermissions.ADMINISTRATOR.key, PageRequest.of(0, 1))).hasSize(1)
    }

    private fun givenUser(lastLogin: LocalDateTime?, createdAt: LocalDateTime = LONG_AGO, administrator: Boolean = false): Long {
        val number = fixtureCounter++
        val newUser = UserEntity(
            username = "expiry-count-user-$number",
            password = "irrelevant",
            personnelNumber = "expiry-count-user-$number",
            firstname = "first",
            lastname = "last",
            enabled = true,
        ).apply { this.lastLogin = lastLogin }
        if (administrator) {
            newUser.authorities.add(UserAuthorityEntity(user = newUser, name = UserPermissions.ADMINISTRATOR.key))
        }

        val user = userRepository.save(newUser)
        jdbcTemplate.update("UPDATE users SET created_at = ? WHERE id = ?", createdAt, user.id)
        return user.id!!
    }
}
