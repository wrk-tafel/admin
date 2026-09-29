package at.wrk.tafel.admin.backend.database.model.notification

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.base.BaseEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table
import java.time.LocalDateTime

/** A message an administrator published for every user; shown in the bell until it expires or is deleted. */
@Entity(name = "Announcement")
@Table(name = "announcements")
@ExcludeFromTestCoverage
class AnnouncementEntity : BaseEntity() {

    @Column(name = "created_at", nullable = false)
    var createdAt: LocalDateTime = LocalDateTime.now()

    @Column(name = "created_by")
    var createdBy: Long? = null

    @Column(name = "title", nullable = false)
    var title: String = ""

    @Column(name = "message", nullable = false)
    var message: String = ""

    @Column(name = "expires_at")
    var expiresAt: LocalDateTime? = null
}
