package at.wrk.tafel.admin.backend.database.model.auth

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDateTime

interface PasskeyChallengeRepository : JpaRepository<PasskeyChallengeEntity, Long> {

    fun findByUserIdAndPurpose(userId: Long, purpose: PasskeyChallengePurpose): PasskeyChallengeEntity?

    /** Native and set-based, like the other token cleanups: no load-and-remove-one-by-one. */
    @Modifying
    @Query(value = "DELETE FROM passkey_challenges WHERE user_id = :userId AND purpose = :purpose", nativeQuery = true)
    fun deleteAllByUserIdAndPurpose(@Param("userId") userId: Long, @Param("purpose") purpose: String): Int

    /** Skips a row another request holds; whoever asks next deletes it, so no scheduled job is needed. */
    @Modifying
    @Query(
        value = """
            DELETE FROM passkey_challenges
            WHERE id IN (
                SELECT id FROM passkey_challenges
                WHERE expires_at < :now
                FOR UPDATE SKIP LOCKED
            )
        """,
        nativeQuery = true,
    )
    fun deleteAllExpiredSkipLocked(@Param("now") now: LocalDateTime): Int
}
