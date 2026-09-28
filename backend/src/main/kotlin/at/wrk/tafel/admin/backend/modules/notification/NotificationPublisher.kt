package at.wrk.tafel.admin.backend.modules.notification

import at.wrk.tafel.admin.backend.database.model.notification.NotificationEntity
import at.wrk.tafel.admin.backend.database.model.notification.NotificationRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

/**
 * The write side of the inbox, for other modules. Runs in its own transaction: an inbox entry is a
 * convenience copy of a notification, so it neither has to roll back with the caller nor may fail
 * because the caller happens to run inside a read-only transaction.
 */
@Service
class NotificationPublisher(
    private val notificationRepository: NotificationRepository,
) {

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    fun publish(userIds: Collection<Long>, type: String, title: String, body: String, targetPath: String?) {
        if (userIds.isEmpty()) return
        val now = LocalDateTime.now()
        notificationRepository.saveAll(
            userIds.map { userId ->
                NotificationEntity().apply {
                    createdAt = now
                    this.userId = userId
                    this.type = type
                    this.title = title.take(200)
                    this.body = body.take(1000)
                    this.targetPath = targetPath?.ifBlank { null }
                }
            },
        )
    }
}
