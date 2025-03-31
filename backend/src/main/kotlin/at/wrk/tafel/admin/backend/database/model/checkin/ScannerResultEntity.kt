package at.wrk.tafel.admin.backend.database.model.checkin

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.base.BaseEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table
import java.time.LocalDateTime

@Entity(name = "ScannerResult")
@Table(name = "scanner_results")
@ExcludeFromTestCoverage
class ScannerResultEntity : BaseEntity() {

    @Column(name = "scan_time")
    var scanTime: LocalDateTime? = null

    @Column(name = "scanner_id")
    var scannerId: Int? = null

    @Column(name = "customer_id")
    var customerId: Long? = null

}
