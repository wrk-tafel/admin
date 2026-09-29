package at.wrk.tafel.admin.backend.database.model.notification

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

interface AnnouncementRepository : JpaRepository<AnnouncementEntity, Long> {

    fun findAllByOrderByCreatedAtDescIdDesc(): List<AnnouncementEntity>

    @Query("select a from Announcement a where a.expiresAt is null or a.expiresAt > :now order by a.createdAt desc, a.id desc")
    fun findActive(@Param("now") now: LocalDateTime): List<AnnouncementEntity>

    @Query(
        value = "SELECT announcement_id FROM announcement_reads WHERE user_id = :userId",
        nativeQuery = true,
    )
    fun findReadAnnouncementIds(@Param("userId") userId: Long): List<Long>

    @Modifying
    @Transactional
    @Query(
        value = """
            INSERT INTO announcement_reads (announcement_id, user_id, read_at)
            SELECT a.id, :userId, :now FROM announcements a
            WHERE a.id IN (:ids)
            ON CONFLICT DO NOTHING
        """,
        nativeQuery = true,
    )
    fun markRead(@Param("ids") ids: Collection<Long>, @Param("userId") userId: Long, @Param("now") now: LocalDateTime): Int

    @Modifying
    @Transactional
    @Query(
        value = """
            DELETE FROM announcements
            WHERE id IN (
                SELECT id FROM announcements
                WHERE expires_at IS NOT NULL AND expires_at < :before
                FOR UPDATE SKIP LOCKED
            )
        """,
        nativeQuery = true,
    )
    fun deleteAllExpiredBeforeSkipLocked(@Param("before") before: LocalDateTime): Int
}
