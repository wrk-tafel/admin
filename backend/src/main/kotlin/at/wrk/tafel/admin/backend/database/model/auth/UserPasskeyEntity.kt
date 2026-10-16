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
 * One passkey (WebAuthn credential) of a user - see `PasskeyService`. [attestedCredentialData] is what the
 * authenticator delivered at registration (its AAGUID, the credential id and the public key); the private key
 * never leaves the device, so nothing here is a secret.
 *
 * Audited (`AuditScope`), which is why adding and removing one goes through the entity. What changes on every
 * use does not: [signCount] and [lastUsedAt] are written only by [UserPasskeyRepository.recordUse] after the
 * insert.
 */
@Entity(name = "UserPasskey")
@Table(name = "user_passkeys")
@ExcludeFromTestCoverage
class UserPasskeyEntity(
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    var user: UserEntity,
    /** The id the authenticator chose, base64url-encoded as the browser reports it. */
    @Column(name = "credential_id", nullable = false, updatable = false)
    var credentialId: String,
    /** What the user called it, to tell several apart. */
    @Column(name = "name", nullable = false)
    var name: String,
    @Column(name = "attested_credential_data", nullable = false, updatable = false)
    var attestedCredentialData: ByteArray,
    /** How the authenticator can be reached (`internal`, `hybrid`, `usb`, ...), comma-separated - a hint for the browser. */
    @Column(name = "transports", updatable = false)
    var transports: String? = null,
    /** The authenticator's signature counter at registration. */
    @Column(name = "sign_count", nullable = false, updatable = false)
    var signCount: Long = 0,
) : BaseEntity() {

    @Column(name = "created_at", nullable = false, updatable = false)
    @CreationTimestamp
    var createdAt: LocalDateTime? = null

    @Column(name = "last_used_at", insertable = false, updatable = false)
    var lastUsedAt: LocalDateTime? = null
}
