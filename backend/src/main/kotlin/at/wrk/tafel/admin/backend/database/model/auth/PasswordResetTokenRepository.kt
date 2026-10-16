package at.wrk.tafel.admin.backend.database.model.auth

import jakarta.persistence.LockModeType
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDateTime

interface PasswordResetTokenRepository : JpaRepository<PasswordResetTokenEntity, Long> {

    /**
     * Locks the row, so two requests handing in the same link cannot both get past the "not used yet"
     * check - the second one waits and then sees [PasswordResetTokenEntity.usedAt] set.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    fun findByTokenHash(tokenHash: String): PasswordResetTokenEntity?

    fun findFirstByUserIdOrderByCreatedAtDesc(userId: Long): PasswordResetTokenEntity?

    /** Native and set-based, like the other token cleanups: no load-and-remove-one-by-one. */
    @Modifying
    @Query(value = "DELETE FROM password_reset_tokens WHERE user_id = :userId", nativeQuery = true)
    fun deleteAllByUserId(@Param("userId") userId: Long): Int

    /**
     * Expired and used tokens alike - a used one is worth nothing either. Skips a row another
     * instance or request holds; the next run deletes it (ADR-0047).
     */
    @Modifying
    @Query(
        value = """
            DELETE FROM password_reset_tokens
            WHERE id IN (
                SELECT id FROM password_reset_tokens
                WHERE expires_at < :now OR used_at IS NOT NULL
                FOR UPDATE SKIP LOCKED
            )
        """,
        nativeQuery = true,
    )
    fun deleteAllExpiredOrUsedSkipLocked(@Param("now") now: LocalDateTime): Int
}
