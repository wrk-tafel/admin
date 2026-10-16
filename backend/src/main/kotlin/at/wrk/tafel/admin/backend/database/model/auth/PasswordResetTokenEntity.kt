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
 * One "Passwort vergessen?" link: [tokenHash] is the SHA-256 of the token that was mailed, never the
 * token itself - see `PasswordResetService` and ADR-0072. Like `MfaEmailCodeEntity` it is neither a
 * change-tracking entity nor audited: a short-lived row with nothing worth a diff. What it was used
 * for - the password change - is audited on the user.
 */
@Entity(name = "PasswordResetToken")
@Table(name = "password_reset_tokens")
@ExcludeFromTestCoverage
class PasswordResetTokenEntity(
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    var user: UserEntity,
    @Column(name = "token_hash", nullable = false)
    var tokenHash: String,
    @Column(name = "expires_at", nullable = false)
    var expiresAt: LocalDateTime,
) : BaseEntity() {

    @Column(name = "used_at")
    var usedAt: LocalDateTime? = null

    @Column(name = "created_at", nullable = false, updatable = false)
    @CreationTimestamp
    var createdAt: LocalDateTime? = null
}
