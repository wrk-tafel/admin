package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.push.PushPreferencesEntity
import at.wrk.tafel.admin.backend.database.model.push.PushPreferencesRepository
import at.wrk.tafel.admin.backend.database.model.push.PushTypePreferenceEntity
import at.wrk.tafel.admin.backend.database.model.push.PushTypePreferenceRepository
import at.wrk.tafel.admin.backend.modules.base.exception.TafelApiException
import at.wrk.tafel.admin.backend.modules.push.model.PushMasterPreferenceRequest
import at.wrk.tafel.admin.backend.modules.push.model.PushNotificationTypePreferenceItem
import at.wrk.tafel.admin.backend.modules.push.model.PushPreferencesResponse
import at.wrk.tafel.admin.backend.modules.push.model.PushTypePreferenceRequest
import org.springframework.http.HttpStatus
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import at.wrk.tafel.admin.backend.database.model.push.PushNotificationType as PushNotificationTypeEntity
import at.wrk.tafel.admin.backend.modules.push.model.PushNotificationType as PushNotificationTypeApi

/**
 * Per-user push notification preferences: a master switch (all devices, all notification types)
 * plus an opt-out per notification type. Absence of a row in either table means enabled - the
 * previous, and still the default, behaviour of every subscribed device receiving every push (see
 * [PushBroadcastService]), so no backfill was needed when these tables were introduced.
 */
@Service
class PushPreferencesService(
    private val pushPreferencesRepository: PushPreferencesRepository,
    private val pushTypePreferenceRepository: PushTypePreferenceRepository,
    private val userRepository: UserRepository,
) {

    @Transactional(readOnly = true)
    fun getPreferencesForCurrentUser(): PushPreferencesResponse {
        val user = requireCurrentUser()
        return buildResponse(user)
    }

    @Transactional
    fun updateMasterPreference(request: PushMasterPreferenceRequest): PushPreferencesResponse {
        val user = requireCurrentUser()

        val entity = pushPreferencesRepository.findByUserId(user.id!!) ?: PushPreferencesEntity()
        entity.user = user
        entity.enabled = request.enabled
        pushPreferencesRepository.saveAndFlush(entity)

        // Built from the entity just saved rather than re-querying it, so the response reflects
        // this call's own write immediately.
        return buildResponse(user, masterEnabled = entity.enabled)
    }

    @Transactional
    fun updateTypePreference(type: PushNotificationTypeApi, request: PushTypePreferenceRequest): PushPreferencesResponse {
        val user = requireCurrentUser()
        val entityType = PushNotificationTypeEntity.valueOf(type.name)

        val entity = pushTypePreferenceRepository.findByUserIdAndNotificationType(user.id!!, entityType)
            ?: PushTypePreferenceEntity()
        entity.user = user
        entity.notificationType = entityType
        entity.enabled = request.enabled
        pushTypePreferenceRepository.saveAndFlush(entity)

        return buildResponse(user, typeOverride = entityType to entity.enabled)
    }

    /**
     * Whether [userId] should receive a push of [type] right now: the master switch short-
     * circuits every type, an explicit per-type row overrides the opt-in default, and absence of
     * either row means enabled. Called from [PushBroadcastService], not a controller, so it works
     * directly with the persistence-layer enum rather than the API-facing mirror.
     */
    @Transactional(readOnly = true)
    fun isEnabled(userId: Long, type: PushNotificationTypeEntity): Boolean {
        val masterEnabled = pushPreferencesRepository.findByUserId(userId)?.enabled ?: true
        if (!masterEnabled) {
            return false
        }

        return pushTypePreferenceRepository.findByUserIdAndNotificationType(userId, type)?.enabled ?: true
    }

    /**
     * [masterEnabled]/[typeOverride] let a caller that just wrote a preference pass its own
     * in-memory result straight through, rather than relying on a re-query to see its own write.
     *
     * Only the types this user is actually an audience for are listed
     * ([PushNotificationTypeTargeting]) - the same rule [PushBroadcastService] applies when sending,
     * so the settings screen can't offer a toggle for something that would never arrive whichever
     * way it is set.
     */
    private fun buildResponse(
        user: UserEntity,
        masterEnabled: Boolean = pushPreferencesRepository.findByUserId(user.id!!)?.enabled ?: true,
        typeOverride: Pair<PushNotificationTypeEntity, Boolean>? = null,
    ): PushPreferencesResponse {
        val typePreferencesByType = pushTypePreferenceRepository.findAllByUserId(user.id!!)
            .associate { it.notificationType to it.enabled }
            .let { if (typeOverride != null) it + typeOverride else it }

        val authorities = user.authorities.map { it.name }
        val types = PushNotificationTypeEntity.entries
            .filter { PushNotificationTypeTargeting.isAllowedFor(it, authorities) }
            .map { type ->
                PushNotificationTypePreferenceItem(
                    type = PushNotificationTypeApi.valueOf(type.name),
                    enabled = typePreferencesByType[type] ?: true,
                )
            }

        return PushPreferencesResponse(masterEnabled = masterEnabled, types = types)
    }

    private fun requireCurrentUser() = (SecurityContextHolder.getContext().authentication as TafelJwtAuthentication).username
        ?.let { userRepository.findByUsername(it) }
        ?: throw TafelApiException(HttpStatus.UNAUTHORIZED, "Nicht angemeldet")
}
