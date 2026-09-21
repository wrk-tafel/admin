package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.database.model.auth.UserPreferencesEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserPreferencesRepository
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.security.testUserEntity
import io.mockk.every
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import at.wrk.tafel.admin.backend.common.auth.model.UserTheme as UserThemeApi
import at.wrk.tafel.admin.backend.database.model.auth.UserTheme as UserThemeEntity

@ExtendWith(MockKExtension::class)
internal class UserPreferencesServiceTest {

    @RelaxedMockK
    private lateinit var userPreferencesRepository: UserPreferencesRepository

    @RelaxedMockK
    private lateinit var userRepository: UserRepository

    private lateinit var service: UserPreferencesService

    @BeforeEach
    fun beforeEach() {
        service = UserPreferencesService(userPreferencesRepository, userRepository)
        every { userRepository.findByUsername(testUserEntity.username) } returns testUserEntity
        every { userPreferencesRepository.findByUserId(any()) } returns null
    }

    @Test
    fun `theme defaults to system without a stored preference`() {
        assertThat(service.getTheme(testUserEntity.username)).isEqualTo(UserThemeApi.SYSTEM)
    }

    @Test
    fun `theme defaults to system for an unknown user`() {
        every { userRepository.findByUsername("unknown") } returns null

        assertThat(service.getTheme("unknown")).isEqualTo(UserThemeApi.SYSTEM)
    }

    @Test
    fun `stored theme is returned`() {
        every { userPreferencesRepository.findByUserId(any()) } returns UserPreferencesEntity().apply {
            theme = UserThemeEntity.DARK
        }

        assertThat(service.getTheme(testUserEntity.username)).isEqualTo(UserThemeApi.DARK)
    }

    @Test
    fun `first update creates the preferences row`() {
        val saved = slot<UserPreferencesEntity>()
        every { userPreferencesRepository.saveAndFlush(capture(saved)) } answers { saved.captured }

        val response = service.updateTheme(testUserEntity.username, UserThemeApi.DARK)

        assertThat(response.theme).isEqualTo(UserThemeApi.DARK)
        assertThat(saved.captured.user).isSameAs(testUserEntity)
        assertThat(saved.captured.theme).isEqualTo(UserThemeEntity.DARK)
    }

    @Test
    fun `update changes the existing preferences row`() {
        val existing = UserPreferencesEntity().apply { theme = UserThemeEntity.DARK }
        every { userPreferencesRepository.findByUserId(any()) } returns existing
        every { userPreferencesRepository.saveAndFlush(existing) } returns existing

        service.updateTheme(testUserEntity.username, UserThemeApi.LIGHT)

        assertThat(existing.theme).isEqualTo(UserThemeEntity.LIGHT)
        verify { userPreferencesRepository.saveAndFlush(existing) }
    }

    @Test
    fun `update for an unknown user is rejected`() {
        every { userRepository.findByUsername("unknown") } returns null

        assertThrows<NotFoundException> { service.updateTheme("unknown", UserThemeApi.LIGHT) }
    }
}
