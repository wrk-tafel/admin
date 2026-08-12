package at.wrk.tafel.admin.backend.database.model.auth

import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

interface LoginAttemptRepository : JpaRepository<LoginAttemptEntity, Long> {

    fun findByUsername(username: String): LoginAttemptEntity?

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

    /**
     * The attempts a filtered page of the administration screen shows, currently locked ones first:
     * an operator opens that screen because somebody is locked out, not to browse the failures that
     * expired on their own.
     *
     * [usernamePattern] is a lower-cased `like` pattern - `%` alone for "no filter", so the query
     * never has to compare a null parameter. [now] is passed in rather than taken from the database,
     * so the ordering and the lock state the caller reports come from the same clock.
     */
    @Query(
        """
            SELECT l FROM LoginAttempt l
            WHERE LOWER(l.username) LIKE :usernamePattern
              AND (:lockedOnly = FALSE OR (l.lockedUntil IS NOT NULL AND l.lockedUntil > :now))
            ORDER BY CASE WHEN l.lockedUntil IS NOT NULL AND l.lockedUntil > :now THEN 0 ELSE 1 END,
                     l.lastFailureAt DESC, l.id DESC
        """,
        countQuery = """
            SELECT COUNT(l) FROM LoginAttempt l
            WHERE LOWER(l.username) LIKE :usernamePattern
              AND (:lockedOnly = FALSE OR (l.lockedUntil IS NOT NULL AND l.lockedUntil > :now))
        """,
    )
    fun findAllFiltered(
        @Param("usernamePattern") usernamePattern: String,
        @Param("lockedOnly") lockedOnly: Boolean,
        @Param("now") now: LocalDateTime,
        pageRequest: PageRequest,
    ): Page<LoginAttemptEntity>
}
