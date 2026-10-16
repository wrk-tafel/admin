package at.wrk.tafel.admin.backend.database.model.auth

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.base.BaseEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import org.hibernate.annotations.CreationTimestamp
import java.time.LocalDateTime

/**
 * A pending change of the own e-mail address: [newEmail] takes effect once the link mailed to
 * [oldEmail] is confirmed - see `EmailChangeService` and ADR-0072. Not audited itself; the change
 * of the address, once confirmed, is audited on the user.
 */
@Entity(name = "EmailChangeToken")
@Table(name = "email_change_tokens")
@ExcludeFromTestCoverage
class EmailChangeTokenEntity(
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    var user: UserEntity,
    @Column(name = "old_email", nullable = false)
    var oldEmail: String,
    @Column(name = "new_email", nullable = false)
    var newEmail: String,
    @Column(name = "token_hash", nullable = false)
    var tokenHash: String,
    @Column(name = "expires_at", nullable = false)
    var expiresAt: LocalDateTime,
) : BaseEntity() {

    @Column(name = "created_at", nullable = false, updatable = false)
    @CreationTimestamp
    var createdAt: LocalDateTime? = null
}
