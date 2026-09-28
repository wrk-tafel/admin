package at.wrk.tafel.admin.backend.database.model.notification

import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

interface NotificationRepository : JpaRepository<NotificationEntity, Long> {

    fun findAllByUserIdOrderByCreatedAtDescIdDesc(userId: Long, pageable: Pageable): List<NotificationEntity>

    fun countByUserIdAndReadAtIsNull(userId: Long): Long

    @Modifying
    @Transactional
    @Query("update Notification n set n.readAt = :now where n.id = :id and n.userId = :userId and n.readAt is null")
    fun markRead(@Param("id") id: Long, @Param("userId") userId: Long, @Param("now") now: LocalDateTime): Int

    @Modifying
    @Transactional
    @Query("update Notification n set n.readAt = :now where n.userId = :userId and n.readAt is null")
    fun markAllRead(@Param("userId") userId: Long, @Param("now") now: LocalDateTime): Int

    /** Native and set-based with SKIP LOCKED, same reasoning as the other retention deletes (ADR-0047). */
    @Modifying
    @Transactional
    @Query(
        value = """
            DELETE FROM notifications
            WHERE id IN (
                SELECT id FROM notifications
                WHERE created_at < :before
                FOR UPDATE SKIP LOCKED
            )
        """,
        nativeQuery = true,
    )
    fun deleteAllCreatedBeforeSkipLocked(@Param("before") before: LocalDateTime): Int
}
