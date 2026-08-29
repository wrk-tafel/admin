package at.wrk.tafel.admin.backend.database.model.auth

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

interface LoginAttemptRepository :
    JpaRepository<LoginAttemptEntity, Long>,
    JpaSpecificationExecutor<LoginAttemptEntity> {

    fun findByUsername(username: String): LoginAttemptEntity?

    fun findAllByUsernameIn(usernames: Collection<String>): List<LoginAttemptEntity>

    fun deleteByUsername(username: String)

    /**
     * Drops the stale attempts, skipping any row another instance already holds - a row being
     * counted up by a concurrent failed login is left to that transaction rather than waited for.
     * Native and set-based, because a derived `deleteAllBy...` loads every matching entity and
     * removes it one by one, which costs a round trip per row and fails outright on the rows a
     * concurrent cleanup already deleted.
     */
    @Modifying
    @Transactional
    @Query(
        value = """
            DELETE FROM login_attempts
            WHERE id IN (
                SELECT id FROM login_attempts
                WHERE last_failure_at < :date
                FOR UPDATE SKIP LOCKED
            )
        """,
        nativeQuery = true,
    )
    fun deleteAllByLastFailureAtBeforeSkipLocked(@Param("date") date: LocalDateTime): Int
}
