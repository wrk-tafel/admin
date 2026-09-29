package at.wrk.tafel.admin.backend.modules.notification.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import java.time.LocalDateTime

@ExcludeFromTestCoverage
enum class NotificationKind { NOTIFICATION, ANNOUNCEMENT }

@ExcludeFromTestCoverage
data class NotificationItem(
    val id: Long,
    val kind: NotificationKind,
    val title: String,
    val body: String,
    /** Path below the app's base path this entry leads to, e.g. `uebersicht`; null when it leads nowhere. */
    val targetPath: String?,
    val createdAt: LocalDateTime,
    val read: Boolean,
)

@ExcludeFromTestCoverage
data class NotificationListResponse(
    val items: List<NotificationItem>,
    val unreadCount: Int,
)

@ExcludeFromTestCoverage
data class AnnouncementRequest(
    @field:NotBlank
    @field:Size(max = 200)
    val title: String,
    @field:NotBlank
    @field:Size(max = 2000)
    val message: String,
    val expiresAt: LocalDateTime? = null,
)

@ExcludeFromTestCoverage
data class AnnouncementResponse(
    val id: Long,
    val title: String,
    val message: String,
    val createdAt: LocalDateTime,
    val expiresAt: LocalDateTime?,
    val active: Boolean,
)

@ExcludeFromTestCoverage
data class AnnouncementListResponse(
    val items: List<AnnouncementResponse>,
)
