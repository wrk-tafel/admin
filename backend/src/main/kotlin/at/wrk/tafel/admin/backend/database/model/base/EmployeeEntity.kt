package at.wrk.tafel.admin.backend.database.model.base

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table

@Entity(name = "Employee")
@Table(name = "employees")
@ExcludeFromTestCoverage
class EmployeeEntity : BaseChangeTrackingEntity() {

    @Column(name = "personnel_number")
    var personnelNumber: String? = null

    @Column(name = "firstname")
    var firstname: String? = null

    @Column(name = "lastname")
    var lastname: String? = null

}
