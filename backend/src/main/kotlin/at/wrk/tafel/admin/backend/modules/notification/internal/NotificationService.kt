package at.wrk.tafel.admin.backend.modules.notification.internal

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.notification.AnnouncementRepository
import at.wrk.tafel.admin.backend.database.model.notification.NotificationRepository
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.notification.model.NotificationItem
import at.wrk.tafel.admin.backend.modules.notification.model.NotificationKind
import at.wrk.tafel.admin.backend.modules.notification.model.NotificationListResponse
import org.springframework.data.domain.PageRequest
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

/**
 * The calling user's bell: their own inbox entries merged with the announcements active right now,
 * newest first. Both kinds carry a read state per user; announcements keep it in
 * `announcement_reads` since one row is shared by everybody.
 */
@Service
class NotificationService(
    private val notificationRepository: NotificationRepository,
    private val announcementRepository: AnnouncementRepository,
    private val userRepository: UserRepository,
) {
    companion object {
        const val MAX_ITEMS = 50
    }

    @Transactional(readOnly = true)
    fun getNotificationsForCurrentUser(): NotificationListResponse {
        val userId = currentUserId()
        val now = LocalDateTime.now()

        val notifications = notificationRepository
            .findAllByUserIdOrderByCreatedAtDescIdDesc(userId, PageRequest.of(0, MAX_ITEMS))
            .map {
                NotificationItem(
                    id = it.id!!,
                    kind = NotificationKind.NOTIFICATION,
                    title = it.title,
                    body = it.body,
                    targetPath = it.targetPath,
                    createdAt = it.createdAt,
                    read = it.readAt != null,
                )
            }

        val readAnnouncements = announcementRepository.findReadAnnouncementIds(userId).toSet()
        val announcements = announcementRepository.findActive(now).map {
            NotificationItem(
                id = it.id!!,
                kind = NotificationKind.ANNOUNCEMENT,
                title = it.title,
                body = it.message,
                targetPath = null,
                createdAt = it.createdAt,
                read = it.id in readAnnouncements,
            )
        }

        val items = (notifications + announcements).sortedByDescending { it.createdAt }.take(MAX_ITEMS)
        // Counted over the whole inbox, not just the page returned, so the badge never under-reports.
        val unreadCount = notificationRepository.countByUserIdAndReadAtIsNull(userId).toInt() +
            announcements.count { !it.read }
        return NotificationListResponse(items = items, unreadCount = unreadCount)
    }

    @Transactional
    fun markRead(kind: NotificationKind, id: Long) {
        val userId = currentUserId()
        val now = LocalDateTime.now()
        when (kind) {
            NotificationKind.NOTIFICATION -> notificationRepository.markRead(id, userId, now)
            NotificationKind.ANNOUNCEMENT -> announcementRepository.markRead(listOf(id), userId, now)
        }
    }

    @Transactional
    fun markAllRead() {
        val userId = currentUserId()
        val now = LocalDateTime.now()
        notificationRepository.markAllRead(userId, now)
        val active = announcementRepository.findActive(now).mapNotNull { it.id }
        if (active.isNotEmpty()) {
            announcementRepository.markRead(active, userId, now)
        }
    }

    private fun currentUserId(): Long {
        val username = (SecurityContextHolder.getContext().authentication as TafelJwtAuthentication).username
        return username?.let { userRepository.findByUsername(it)?.id } ?: throw NotFoundException("Benutzer nicht gefunden")
    }
}
