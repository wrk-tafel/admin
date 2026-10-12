package at.wrk.tafel.admin.backend.database.model.auth

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.base.BaseEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import java.time.LocalDateTime

/** What a pending passkey ceremony is for - a challenge issued for one is never accepted for the other. */
enum class PasskeyChallengePurpose {
    REGISTRATION,
    AUTHENTICATION,
}

/**
 * The challenge of a passkey ceremony that was started and not answered yet - one per user and [purpose]
 * (`passkey_challenges` has a unique index on both). Like `MfaEmailCodeEntity` it is neither a change-tracking
 * entity nor audited: a short-lived row with nothing worth a diff.
 */
@Entity(name = "PasskeyChallenge")
@Table(name = "passkey_challenges")
@ExcludeFromTestCoverage
class PasskeyChallengeEntity(
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    var user: UserEntity,
    @Enumerated(EnumType.STRING)
    @Column(name = "purpose", nullable = false)
    var purpose: PasskeyChallengePurpose,
    /** The random challenge, base64url-encoded as it is sent to the browser. */
    @Column(name = "challenge", nullable = false)
    var challenge: String,
    @Column(name = "expires_at", nullable = false)
    var expiresAt: LocalDateTime,
) : BaseEntity()
