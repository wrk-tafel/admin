package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.database.model.push.PushNotificationType
import at.wrk.tafel.admin.backend.modules.notification.AnnouncementPublishedEvent
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Component
import org.springframework.transaction.event.TransactionPhase
import org.springframework.transaction.event.TransactionalEventListener

/**
 * Sends a newly published announcement as a push notification. Like every type, it goes to the
 * devices of users who have push on and this type not switched off - so it is sent by default and
 * each user decides for themselves. It is deliberately not added to the inbox again: the
 * announcement already is an entry in every user's bell.
 *
 * After commit, so a rolled-back announcement is never announced; `@Async` so the administrator's
 * request does not wait on one HTTPS send per subscribed device.
 */
@Component
class AnnouncementPushListener(
    private val pushBroadcastService: PushBroadcastService,
) {

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    fun onAnnouncementPublished(event: AnnouncementPublishedEvent) {
        pushBroadcastService.broadcast(
            type = PushNotificationType.ANNOUNCEMENT,
            title = event.title,
            body = event.message.take(MAX_BODY_LENGTH),
            addToInbox = false,
        )
    }

    private companion object {
        const val MAX_BODY_LENGTH = 200
    }
}
