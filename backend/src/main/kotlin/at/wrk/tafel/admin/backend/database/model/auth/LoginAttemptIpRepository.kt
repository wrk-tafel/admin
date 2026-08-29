package at.wrk.tafel.admin.backend.database.model.auth

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

interface LoginAttemptIpRepository : JpaRepository<LoginAttemptIpEntity, Long> {

    fun findByIpAddress(ipAddress: String): LoginAttemptIpEntity?

    /**
     * Drops the stale attempts, skipping any row another instance already holds - mirrors
     * LoginAttemptRepository.deleteAllByLastFailureAtBeforeSkipLocked, see there for why this is
     * native and set-based rather than a derived `deleteAllBy...`.
     */
    @Modifying
    @Transactional
    @Query(
        value = """
            DELETE FROM login_attempts_ip
            WHERE id IN (
                SELECT id FROM login_attempts_ip
                WHERE last_failure_at < :date
                FOR UPDATE SKIP LOCKED
            )
        """,
        nativeQuery = true,
    )
    fun deleteAllByLastFailureAtBeforeSkipLocked(@Param("date") date: LocalDateTime): Int
}
