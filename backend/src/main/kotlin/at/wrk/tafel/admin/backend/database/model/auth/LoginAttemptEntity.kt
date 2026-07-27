package at.wrk.tafel.admin.backend.database.model.auth

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.base.BaseChangeTrackingEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table
import java.time.LocalDateTime

@Entity(name = "LoginAttempt")
@Table(name = "login_attempts")
@ExcludeFromTestCoverage
class LoginAttemptEntity : BaseChangeTrackingEntity() {

    @Column(name = "username")
    var username: String? = null

    @Column(name = "failure_count")
    var failureCount: Int? = null

    @Column(name = "last_failure_at")
    var lastFailureAt: LocalDateTime? = null

    @Column(name = "locked_until")
    var lockedUntil: LocalDateTime? = null
}
