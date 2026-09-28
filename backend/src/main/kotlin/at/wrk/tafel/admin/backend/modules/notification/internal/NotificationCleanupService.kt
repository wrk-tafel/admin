package at.wrk.tafel.admin.backend.modules.notification.internal

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.notification.AnnouncementRepository
import at.wrk.tafel.admin.backend.database.model.notification.NotificationRepository
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import java.time.LocalDateTime
import java.util.concurrent.TimeUnit

/**
 * Empties the bell's history: an inbox entry has served its purpose a while after it arrived, and an
 * announcement a while after it expired. Both deletes claim their rows with `SKIP LOCKED`, so a
 * second instance shares the work (ADR-0047).
 */
@Service
class NotificationCleanupService(
    private val notificationRepository: NotificationRepository,
    private val announcementRepository: AnnouncementRepository,
    private val tafelAdminProperties: TafelAdminProperties,
) {
    companion object {
        private val logger = LoggerFactory.getLogger(NotificationCleanupService::class.java)
    }

    @Scheduled(fixedDelay = 1, timeUnit = TimeUnit.HOURS)
    fun cleanup() {
        val before = LocalDateTime.now().minus(tafelAdminProperties.notification.retention)
        val notifications = notificationRepository.deleteAllCreatedBeforeSkipLocked(before)
        val announcements = announcementRepository.deleteAllExpiredBeforeSkipLocked(before)
        if (notifications > 0 || announcements > 0) {
            logger.info("Removed {} old notifications and {} expired announcements", notifications, announcements)
        }
    }
}
