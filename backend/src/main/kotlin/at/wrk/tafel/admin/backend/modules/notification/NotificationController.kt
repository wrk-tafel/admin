package at.wrk.tafel.admin.backend.modules.notification

import at.wrk.tafel.admin.backend.modules.notification.internal.NotificationService
import at.wrk.tafel.admin.backend.modules.notification.model.NotificationKind
import at.wrk.tafel.admin.backend.modules.notification.model.NotificationListResponse
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/** The caller's own bell. Every logged-in user has one, so no dedicated permission. */
@RestController
@RequestMapping("/api/notifications")
@PreAuthorize("isAuthenticated()")
class NotificationController(
    private val notificationService: NotificationService,
) {

    @GetMapping
    fun getNotifications(): NotificationListResponse = notificationService.getNotificationsForCurrentUser()

    @PostMapping("/{kind}/{id}/read")
    fun markRead(@PathVariable kind: NotificationKind, @PathVariable id: Long): ResponseEntity<Void> {
        notificationService.markRead(kind, id)
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/read-all")
    fun markAllRead(): ResponseEntity<Void> {
        notificationService.markAllRead()
        return ResponseEntity.noContent().build()
    }
}
