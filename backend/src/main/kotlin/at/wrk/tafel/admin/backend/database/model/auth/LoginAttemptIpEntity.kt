package at.wrk.tafel.admin.backend.database.model.auth

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.base.BaseChangeTrackingEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table
import java.time.LocalDateTime

@Entity(name = "LoginAttemptIp")
@Table(name = "login_attempts_ip")
@ExcludeFromTestCoverage
class LoginAttemptIpEntity(
    @Column(name = "ip_address")
    var ipAddress: String,
    @Column(name = "last_failure_at")
    var lastFailureAt: LocalDateTime,
    @Column(name = "failure_count")
    var failureCount: Int = 0,
) : BaseChangeTrackingEntity() {

    @Column(name = "locked_until")
    var lockedUntil: LocalDateTime? = null
}
