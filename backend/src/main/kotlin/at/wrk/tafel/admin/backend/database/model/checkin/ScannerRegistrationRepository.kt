package at.wrk.tafel.admin.backend.database.model.checkin

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

interface ScannerRegistrationRepository : JpaRepository<ScannerRegistrationEntity, Long> {

    @Query(value = "SELECT pg_advisory_lock(1000)", nativeQuery = true)
    fun acquireLock()

    @Query(value = "SELECT pg_advisory_unlock(1000)", nativeQuery = true)
    fun releaseLock()

    @Query(
        value = """
                SELECT COALESCE(
                (
                    SELECT t.scanner_id + 1
                    FROM (
                    SELECT scanner_id, LEAD(scanner_id) OVER (ORDER BY scanner_id) AS next_scanner_id
                    FROM scanner_registrations
                    ) t
                    WHERE next_scanner_id IS NULL OR next_scanner_id > t.scanner_id + 1
                    ORDER BY t.scanner_id
                    LIMIT 1
                ),
                (SELECT COALESCE(MAX(scanner_id), 0) + 1 FROM scanner_registrations)
                ) AS next_available_scanner_id;
                """, nativeQuery = true
    )
    fun getNextScannerId(): Int

    fun findByScannerId(scannerId: Int?): ScannerRegistrationEntity?

    @Transactional
    fun deleteAllByRegistrationTimeBefore(registrationTime: LocalDateTime)

}
