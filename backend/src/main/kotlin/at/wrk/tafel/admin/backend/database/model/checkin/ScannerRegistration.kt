package at.wrk.tafel.admin.backend.database.model.checkin

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.base.BaseEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table
import java.time.LocalDateTime

@Entity(name = "ScannerRegistration")
@Table(name = "scanner_registrations")
@ExcludeFromTestCoverage
class ScannerRegistrationEntity : BaseEntity() {

    @Column(name = "registration_time")
    var registrationTime: LocalDateTime? = null

    @Column(name = "scanner_id")
    var scannerId: Int? = null

}
