package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.common.lock.AdvisoryLockKey
import at.wrk.tafel.admin.backend.database.common.lock.AdvisoryLockService
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.push.PushSubscriptionEntity
import at.wrk.tafel.admin.backend.database.model.push.PushSubscriptionRepository
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.base.exception.TafelApiException
import at.wrk.tafel.admin.backend.modules.push.model.PushPublicKeyResponse
import at.wrk.tafel.admin.backend.modules.push.model.PushSubscriptionItem
import at.wrk.tafel.admin.backend.modules.push.model.PushSubscriptionLabelRequest
import at.wrk.tafel.admin.backend.modules.push.model.PushSubscriptionRequest
import at.wrk.tafel.admin.backend.modules.push.model.PushTestResponse
import at.wrk.tafel.admin.backend.modules.push.model.PushTestResult
import org.springframework.http.HttpStatus
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class PushSubscriptionService(
    private val pushSubscriptionRepository: PushSubscriptionRepository,
    private val userRepository: UserRepository,
    private val tafelAdminProperties: TafelAdminProperties,
    private val pushBroadcastService: PushBroadcastService,
    private val advisoryLockService: AdvisoryLockService,
) {
    companion object {
        private const val TEST_NOTIFICATION_TITLE = "Test-Benachrichtigung"
        private const val TEST_NOTIFICATION_BODY = "Wenn du das hier siehst, funktionieren Push-Benachrichtigungen auf diesem Gerät."
        private const val SUBSCRIPTION_NOT_FOUND_MESSAGE = "Push-Subscription wurde nicht gefunden"
    }

    fun getPublicKey(): PushPublicKeyResponse {
        // Blank, not just null: see VapidSigner for why a YAML `~` value can surface as an empty
        // string rather than a true absent/null property.
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
     * re-registration (e.g. an effect re-running, or the frontend's self-heal check finding a
     * still-live browser subscription the backend lost track of) should refresh that row instead
     * of hitting the endpoint unique constraint.
     *
     * Reassigns `user` to whoever is currently logged in on every (re-)registration, including on
     * an existing row - on a shared machine (e.g. a distribution-site kiosk), the same browser
     * subscription may get re-registered under a different logged-in user than whoever originally
     * enabled it, and `user` is meant to track "who this device currently represents" (relevant
     * for e.g. future per-user notification preferences), not "who historically first subscribed
     * it."
     *
     * Wrapped in [AdvisoryLockKey.REGISTER_PUSH_SUBSCRIPTION] because the find-then-save below is a
     * check-then-act against a `UNIQUE` column: any two registrations of the same endpoint that
     * overlap both find nothing and both insert, and the loser gets a duplicate-key 500 instead of
     * the registration it asked for - the "push silently never works" symptom this upsert exists to
     * prevent in the first place.
     *
     * They overlap more easily than it looks. `endpoint` identifies the browser, not the caller, so
     * anything holding that browser's subscription is a candidate: reloading straight onto the push
     * settings screen starts a sync from the app shell and from that screen at once, and a second
     * tab or an installed PWA window is another app instance sharing the same endpoint. The
     * frontend collapses the first case into a single request (see
     * `PushNotificationService.syncSubscription`); it cannot see across app instances, and nothing
     * client-side should be load-bearing for a DB constraint anyway.
     */
    @Transactional
    fun createSubscription(request: PushSubscriptionRequest): PushSubscriptionItem = advisoryLockService.withLock(AdvisoryLockKey.REGISTER_PUSH_SUBSCRIPTION) {
        val user = requireCurrentUser()

        val entity = pushSubscriptionRepository.findByEndpoint(request.endpoint) ?: PushSubscriptionEntity()
        entity.user = user
        entity.endpoint = request.endpoint
        entity.p256dhKey = request.p256dhKey
        entity.authKey = request.authKey
        entity.userAgent = request.userAgent

        val saved = pushSubscriptionRepository.saveAndFlush(entity)
        mapToItem(saved)
    }

    @Transactional
    fun updateLabel(id: Long, request: PushSubscriptionLabelRequest): PushSubscriptionItem {
        val user = requireCurrentUser()
        val entity = pushSubscriptionRepository.findByIdAndUserId(id, user.id!!)
            ?: throw NotFoundException(SUBSCRIPTION_NOT_FOUND_MESSAGE)

        entity.label = request.label?.trim()?.ifBlank { null }

        val saved = pushSubscriptionRepository.saveAndFlush(entity)
        return mapToItem(saved)
    }

    /**
     * Sends a test notification to one of the current user's own devices, so "is push actually
     * working on this device?" can be answered on the spot instead of by waiting for the next
     * distribution to start or close.
     *
     * No `@Transactional` here, matching [PushBroadcastService]: an expired subscription gets
     * deleted as part of the send, which a wrapping read-only transaction would reject.
     */
    fun sendTestNotification(id: Long): PushTestResponse {
        val user = requireCurrentUser()
        val entity = pushSubscriptionRepository.findByIdAndUserId(id, user.id!!)
            ?: throw NotFoundException(SUBSCRIPTION_NOT_FOUND_MESSAGE)

        val result = pushBroadcastService.sendTo(entity, TEST_NOTIFICATION_TITLE, TEST_NOTIFICATION_BODY)
        return PushTestResponse(
            result = when (result) {
                PushSendResult.SENT -> PushTestResult.SENT
                PushSendResult.EXPIRED -> PushTestResult.EXPIRED
                PushSendResult.NOT_CONFIGURED -> PushTestResult.NOT_CONFIGURED
                PushSendResult.FAILED -> PushTestResult.FAILED
            },
        )
    }

    @Transactional
    fun deleteSubscription(id: Long) {
        val user = requireCurrentUser()
        val deletedCount = pushSubscriptionRepository.deleteByIdAndUserId(id, user.id!!)
        if (deletedCount == 0L) {
            throw NotFoundException(SUBSCRIPTION_NOT_FOUND_MESSAGE)
        }
    }

    private fun currentUser() = (SecurityContextHolder.getContext().authentication as TafelJwtAuthentication).username
        ?.let { userRepository.findByUsername(it) }

    private fun requireCurrentUser() = currentUser()
        ?: throw TafelApiException(HttpStatus.UNAUTHORIZED, "Nicht angemeldet")

    private fun mapToItem(entity: PushSubscriptionEntity) = PushSubscriptionItem(
        id = entity.id!!,
        endpoint = entity.endpoint!!,
        userAgent = entity.userAgent,
        label = entity.label,
        createdAt = entity.createdAt!!,
    )
}
