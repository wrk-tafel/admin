package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.push.PushSubscriptionEntity
import at.wrk.tafel.admin.backend.database.model.push.PushSubscriptionRepository
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.base.exception.TafelApiException
import at.wrk.tafel.admin.backend.modules.push.model.PushPublicKeyResponse
import at.wrk.tafel.admin.backend.modules.push.model.PushSubscriptionItem
import at.wrk.tafel.admin.backend.modules.push.model.PushSubscriptionRequest
import org.springframework.http.HttpStatus
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class PushSubscriptionService(
    private val pushSubscriptionRepository: PushSubscriptionRepository,
    private val userRepository: UserRepository,
    private val tafelAdminProperties: TafelAdminProperties,
) {

    fun getPublicKey(): PushPublicKeyResponse {
        // Blank, not just null: see WebPushConfig.pushService for why a YAML `~` value can
        // surface as an empty string rather than a true absent/null property.
        val publicKey = tafelAdminProperties.push?.vapidPublicKey?.takeIf { it.isNotBlank() }
            ?: throw TafelApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Push-Benachrichtigungen sind nicht konfiguriert")
        return PushPublicKeyResponse(publicKey = publicKey)
    }

    @Transactional(readOnly = true)
    fun getSubscriptionsForCurrentUser(): List<PushSubscriptionItem> {
        val user = currentUser() ?: return emptyList()
        return pushSubscriptionRepository.findAllByUserId(user.id!!).map { mapToItem(it) }
    }

    /**
     * Upserts by endpoint rather than always inserting - a browser keeps reusing the same
     * `PushSubscription.endpoint` for a device until it unsubscribes at the browser level, so a
     * re-registration (e.g. an effect re-running, or a previously different user having opted in
     * on a shared machine) should reclaim that row instead of hitting the endpoint unique
     * constraint.
     */
    @Transactional
    fun createSubscription(request: PushSubscriptionRequest): PushSubscriptionItem {
        val user = currentUser() ?: throw TafelApiException(HttpStatus.UNAUTHORIZED, "Nicht angemeldet")

        val entity = pushSubscriptionRepository.findByEndpoint(request.endpoint) ?: PushSubscriptionEntity()
        entity.user = user
        entity.endpoint = request.endpoint
        entity.p256dhKey = request.p256dhKey
        entity.authKey = request.authKey

        val saved = pushSubscriptionRepository.saveAndFlush(entity)
        return mapToItem(saved)
    }

    @Transactional
    fun deleteSubscription(id: Long) {
        val user = currentUser() ?: throw TafelApiException(HttpStatus.UNAUTHORIZED, "Nicht angemeldet")
        val deletedCount = pushSubscriptionRepository.deleteByIdAndUserId(id, user.id!!)
        if (deletedCount == 0L) {
            throw NotFoundException("Push-Subscription wurde nicht gefunden")
        }
    }

    private fun currentUser() = (SecurityContextHolder.getContext().authentication as TafelJwtAuthentication).username
        ?.let { userRepository.findByUsername(it) }

    private fun mapToItem(entity: PushSubscriptionEntity) = PushSubscriptionItem(
        id = entity.id!!,
        endpoint = entity.endpoint!!,
    )
}
