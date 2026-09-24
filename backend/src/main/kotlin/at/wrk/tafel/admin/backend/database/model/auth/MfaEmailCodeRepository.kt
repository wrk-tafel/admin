package at.wrk.tafel.admin.backend.database.model.auth

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDateTime

interface MfaEmailCodeRepository : JpaRepository<MfaEmailCodeEntity, Long> {

    fun findByUserId(userId: Long): MfaEmailCodeEntity?

    /** Native and set-based, like the other token cleanups: no load-and-remove-one-by-one. */
    @Modifying
    @Query(value = "DELETE FROM mfa_email_codes WHERE user_id = :userId", nativeQuery = true)
    fun deleteAllByUserId(@Param("userId") userId: Long): Int

    /** Skips a row another request holds; whoever asks next deletes it, so no scheduled job is needed. */
    @Modifying
    @Query(
        value = """
            DELETE FROM mfa_email_codes
            WHERE id IN (
                SELECT id FROM mfa_email_codes
                WHERE expires_at < :now
                FOR UPDATE SKIP LOCKED
            )
        """,
        nativeQuery = true,
    )
    fun deleteAllExpiredSkipLocked(@Param("now") now: LocalDateTime): Int
}
