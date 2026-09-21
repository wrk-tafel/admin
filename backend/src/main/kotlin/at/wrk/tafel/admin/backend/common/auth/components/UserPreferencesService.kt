package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.auth.model.UserThemeResponse
import at.wrk.tafel.admin.backend.database.model.auth.UserPreferencesEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserPreferencesRepository
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import at.wrk.tafel.admin.backend.common.auth.model.UserTheme as UserThemeApi
import at.wrk.tafel.admin.backend.database.model.auth.UserTheme as UserThemeEntity

/**
 * A user's display preferences. A user who never changed one has no row and gets the defaults, so
 * reading never writes.
 */
@Service
class UserPreferencesService(
    private val userPreferencesRepository: UserPreferencesRepository,
    private val userRepository: UserRepository,
) {

    @Transactional(readOnly = true)
    fun getTheme(username: String): UserThemeApi {
        val user = userRepository.findByUsername(username) ?: return UserThemeApi.SYSTEM
        val entity = userPreferencesRepository.findByUserId(user.id!!) ?: return UserThemeApi.SYSTEM
        return UserThemeApi.valueOf(entity.theme.name)
    }

    @Transactional
    fun updateTheme(username: String, theme: UserThemeApi): UserThemeResponse {
        val user = userRepository.findByUsername(username)
            ?: throw NotFoundException("Benutzer nicht gefunden!")

        val entity = userPreferencesRepository.findByUserId(user.id!!) ?: UserPreferencesEntity()
        entity.user = user
        entity.theme = UserThemeEntity.valueOf(theme.name)
        userPreferencesRepository.saveAndFlush(entity)

        return UserThemeResponse(theme = theme)
    }
}
