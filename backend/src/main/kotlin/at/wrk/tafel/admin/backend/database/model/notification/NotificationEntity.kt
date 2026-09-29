package at.wrk.tafel.admin.backend.database.model.notification

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.base.BaseEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table
import java.time.LocalDateTime

/** One entry in a single user's bell inbox - the persisted counterpart of a push notification. */
@Entity(name = "Notification")
@Table(name = "notifications")
@ExcludeFromTestCoverage
class NotificationEntity : BaseEntity() {

    @Column(name = "created_at", nullable = false)
    var createdAt: LocalDateTime = LocalDateTime.now()

    @Column(name = "user_id", nullable = false)
    var userId: Long = 0

    @Column(name = "type", nullable = false)
    var type: String = ""

    @Column(name = "title", nullable = false)
    var title: String = ""

    @Column(name = "body", nullable = false)
    var body: String = ""

    @Column(name = "target_path")
    var targetPath: String? = null

    @Column(name = "read_at")
    var readAt: LocalDateTime? = null
}
