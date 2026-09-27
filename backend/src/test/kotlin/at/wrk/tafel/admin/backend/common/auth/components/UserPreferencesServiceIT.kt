package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.jdbc.core.JdbcTemplate
import at.wrk.tafel.admin.backend.common.auth.model.UserTheme as UserThemeApi

/**
 * The `user_preferences` table, its id sequence and the cascade from `users` can only be proven
 * against a real schema - a mocked repository cannot tell that `user_preferences_seq` is missing.
 */
internal class UserPreferencesServiceIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var service: UserPreferencesService

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var jdbcTemplate: JdbcTemplate

    @Test
    fun `theme is stored per user, defaults to system and is removed with the user`() {
        val user = userRepository.saveAndFlush(newUser())

        assertThat(service.getTheme(user.username)).isEqualTo(UserThemeApi.SYSTEM)

        service.updateTheme(user.username, UserThemeApi.DARK)
        assertThat(service.getTheme(user.username)).isEqualTo(UserThemeApi.DARK)

        service.updateTheme(user.username, UserThemeApi.LIGHT)
        assertThat(service.getTheme(user.username)).isEqualTo(UserThemeApi.LIGHT)
        assertThat(rowsFor(user.id!!)).isEqualTo(1)

        userRepository.delete(user)
        userRepository.flush()
        assertThat(rowsFor(user.id!!)).isEqualTo(0)
    }

    private fun rowsFor(userId: Long): Int? = jdbcTemplate.queryForObject(
        "select count(*) from user_preferences where user_id = ?",
        Int::class.java,
        userId,
    )

    private fun newUser() = UserEntity(
        username = "theme-test-${System.nanoTime()}",
        password = "irrelevant",
        personnelNumber = "theme-${System.nanoTime()}",
        firstname = "Test",
        lastname = "Theme",
        enabled = true,
        passwordChangeRequired = false,
    )
}
