package at.wrk.tafel.admin.backend.database.model.base

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table

@Entity(name = "Employee")
@Table(name = "employees")
@ExcludeFromTestCoverage
class EmployeeEntity(
    @Column(name = "personnel_number")
    var personnelNumber: String,
    @Column(name = "firstname")
    var firstname: String,
    @Column(name = "lastname")
    var lastname: String,
) : BaseChangeTrackingEntity()
