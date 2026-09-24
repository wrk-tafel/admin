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
 * The one outstanding e-mail code of a user (`mfa_email_codes.user_id` is unique): [codeHash] is a hash of the
 * code that was mailed, never the code itself - see `MfaEmailCodeService`. It is deliberately neither a
 * change-tracking entity nor audited: a short-lived row with nothing worth a diff.
 */
@Entity(name = "MfaEmailCode")
@Table(name = "mfa_email_codes")
@ExcludeFromTestCoverage
class MfaEmailCodeEntity(
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    var user: UserEntity,
    @Column(name = "code_hash", nullable = false)
    var codeHash: String,
    @Column(name = "expires_at", nullable = false)
    var expiresAt: LocalDateTime,
) : BaseEntity() {

    @Column(name = "created_at", nullable = false, updatable = false)
    @CreationTimestamp
    var createdAt: LocalDateTime? = null
}
