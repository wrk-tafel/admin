package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.auth.model.PermissionCategory
import at.wrk.tafel.admin.backend.common.auth.model.UserPermissions
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.push.PushSubscriptionRepository
import at.wrk.tafel.admin.backend.modules.distribution.DistributionClosedEvent
import org.slf4j.LoggerFactory
import org.springframework.context.event.EventListener
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Component
import tools.jackson.databind.json.JsonMapper
import java.time.format.DateTimeFormatter

/**
 * Reacts to [DistributionClosedEvent] by pushing a "distribution closed" notification to every
 * enabled user holding a `LEADERSHIP`-category permission (see [UserPermissions]). Deliberately
 * no `@Transactional`: [DistributionEntity.startedAt] is a plain column (not lazy), so the fetch
 * doesn't need an open transaction to survive past the repository call, and each subscription
 * send/prune below runs as its own auto-transactional repository call - fine at this recipient
 * volume, and avoids the read-only-transaction-vs-delete conflict a single wrapping
 * `@Transactional(readOnly = true)` (as `reporting`'s listener uses) would create once expired
 * subscriptions need deleting.
 */
@Component
class DistributionClosedPushListener(
    private val distributionRepository: DistributionRepository,
    private val userRepository: UserRepository,
    private val pushSubscriptionRepository: PushSubscriptionRepository,
    private val webPushSenderService: WebPushSenderService,
    private val jsonMapper: JsonMapper,
) {
    companion object {
        private val logger = LoggerFactory.getLogger(DistributionClosedPushListener::class.java)
        private val DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
        private val LEADERSHIP_PERMISSION_KEYS = UserPermissions.entries
            .filter { it.category == PermissionCategory.LEADERSHIP }
            .map { it.key }
    }

    @EventListener
    fun onDistributionClosed(event: DistributionClosedEvent) {
        val distribution = distributionRepository.findByIdOrNull(event.distributionId) ?: return
        val dateFormatted = distribution.startedAt!!.format(DATE_FORMATTER)

        val payload = jsonMapper.writeValueAsString(
            PushNotificationPayload(
                notification = PushNotificationPayloadNotification(
                    title = "Ausgabe beendet",
                    body = "Die Ausgabe vom $dateFormatted wurde beendet, die Statistiken sind bereit.",
                ),
            ),
        )

        val recipients = userRepository.findAllByAuthoritiesNameInAndEnabledTrue(LEADERSHIP_PERMISSION_KEYS)
        recipients.forEach { user ->
            pushSubscriptionRepository.findAllByUserId(user.id!!).forEach { subscription ->
                when (webPushSenderService.send(subscription, payload)) {
                    PushSendResult.SENT -> Unit
                    PushSendResult.EXPIRED -> {
                        logger.info("Removing expired push subscription #${subscription.id}")
                        pushSubscriptionRepository.delete(subscription)
                    }

                    PushSendResult.FAILED -> logger.warn("Push notification to subscription #${subscription.id} failed")
                }
            }
        }
    }
}

@ExcludeFromTestCoverage
data class PushNotificationPayload(
    val notification: PushNotificationPayloadNotification,
)

@ExcludeFromTestCoverage
data class PushNotificationPayloadNotification(
    val title: String,
    val body: String,
    val icon: String = "/icons/icon-192x192.png",
)
