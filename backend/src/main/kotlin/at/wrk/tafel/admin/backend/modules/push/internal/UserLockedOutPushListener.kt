package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.common.auth.model.UserLockedOutEvent
import at.wrk.tafel.admin.backend.database.model.push.PushNotificationType
import org.springframework.context.event.EventListener
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Component

/**
 * Reacts to [UserLockedOutEvent] by telling the people who administer users that an account just
 * locked itself. Both readings of a lockout need someone to act: a colleague who can no longer log
 * in is usually about to phone someone about it, and a burst of them is the only sign this
 * application gives that credentials are being guessed at.
 *
 * `@Async` because [PushBroadcastService.broadcast] blocks on one HTTPS send per subscribed device,
 * and this is reached from a failed *login* request - the request that must not be made slower, and
 * whose response time must not vary with how many devices happen to be subscribed. Note this also
 * decouples it from the publishing transaction; see the publish site in `LoginAttemptService` for
 * why that trade is deliberate.
 */
@Component
class UserLockedOutPushListener(
    private val pushBroadcastService: PushBroadcastService,
) {

    @Async
    @EventListener
    fun onUserLockedOut(event: UserLockedOutEvent) {
        pushBroadcastService.broadcast(
            type = PushNotificationType.USER_LOCKED_OUT,
            title = "Benutzer gesperrt",
            body = "Der Benutzer '${event.username}' wurde nach ${event.failureCount} fehlgeschlagenen Anmeldeversuchen vorübergehend gesperrt.",
        )
    }
}
