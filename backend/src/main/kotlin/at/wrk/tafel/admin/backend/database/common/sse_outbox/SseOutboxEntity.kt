package at.wrk.tafel.admin.backend.database.common.sse_outbox

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.base.BaseEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table
import java.time.LocalDateTime

@Entity(name = "SseOutbox")
@Table(name = "sse_outbox")
@ExcludeFromTestCoverage
class SseOutboxEntity : BaseEntity() {

    @Column(name = "event_time")
    var eventTime: LocalDateTime? = null

    @Column(name = "notification_name")
    var notificationName: String? = null

    @Column(name = "payload")
    var payload: String? = null

}
