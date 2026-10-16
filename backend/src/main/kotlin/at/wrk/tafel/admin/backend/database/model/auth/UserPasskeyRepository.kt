package at.wrk.tafel.admin.backend.database.model.auth

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDateTime

interface UserPasskeyRepository : JpaRepository<UserPasskeyEntity, Long> {

    fun findAllByUserIdOrderByCreatedAtAsc(userId: Long): List<UserPasskeyEntity>

    fun findByUserIdAndCredentialId(userId: Long, credentialId: String): UserPasskeyEntity?

    fun findByIdAndUserId(id: Long, userId: Long): UserPasskeyEntity?

    fun existsByCredentialId(credentialId: String): Boolean

    /**
     * Records one use. A bulk update rather than a save, so a login neither shows up in the audit trail nor
     * loads the row for writing.
     */
    @Modifying
    @Query(
        value = "UPDATE user_passkeys SET sign_count = :signCount, last_used_at = :usedAt WHERE id = :id",
        nativeQuery = true,
    )
    fun recordUse(@Param("id") id: Long, @Param("signCount") signCount: Long, @Param("usedAt") usedAt: LocalDateTime): Int
}
