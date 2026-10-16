package at.wrk.tafel.admin.backend.database.model.auth

import jakarta.persistence.LockModeType
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDateTime

interface EmailChangeTokenRepository : JpaRepository<EmailChangeTokenEntity, Long> {

    /** Locks the row, so two confirmations of the same link cannot both apply it. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    fun findByTokenHash(tokenHash: String): EmailChangeTokenEntity?

    fun findByUserId(userId: Long): EmailChangeTokenEntity?

    /** Native and set-based, like the other token cleanups: no load-and-remove-one-by-one. */
    @Modifying
    @Query(value = "DELETE FROM email_change_tokens WHERE user_id = :userId", nativeQuery = true)
    fun deleteAllByUserId(@Param("userId") userId: Long): Int

    /** Skips a row another instance or request holds; the next run deletes it (ADR-0047). */
    @Modifying
    @Query(
        value = """
            DELETE FROM email_change_tokens
            WHERE id IN (
                SELECT id FROM email_change_tokens
                WHERE expires_at < :now
                FOR UPDATE SKIP LOCKED
            )
        """,
        nativeQuery = true,
    )
    fun deleteAllExpiredSkipLocked(@Param("now") now: LocalDateTime): Int
}
