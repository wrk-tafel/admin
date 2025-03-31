package at.wrk.tafel.admin.backend.database.model.checkin

import org.springframework.data.jpa.repository.JpaRepository
import java.time.LocalDateTime

interface ScannerResultRepository : JpaRepository<ScannerResultEntity, Long> {

    fun deleteAllByScanTimeBefore(scanTime: LocalDateTime)

}
