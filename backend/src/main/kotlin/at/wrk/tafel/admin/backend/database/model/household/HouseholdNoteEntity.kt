package at.wrk.tafel.admin.backend.database.model.household

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.base.BaseChangeTrackingEntity
import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table

@Entity(name = "HouseholdNote")
@Table(name = "household_notes")
@ExcludeFromTestCoverage
class HouseholdNoteEntity(
    @ManyToOne
    @JoinColumn(name = "household_id", nullable = false)
    var household: HouseholdEntity,
    @Column(name = "note")
    var note: String,
) : BaseChangeTrackingEntity() {

    @ManyToOne
    @JoinColumn(name = "employee_id", nullable = true)
    var employee: EmployeeEntity? = null
}
