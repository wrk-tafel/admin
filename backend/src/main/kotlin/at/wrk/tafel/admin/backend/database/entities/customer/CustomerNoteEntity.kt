package at.wrk.tafel.admin.backend.database.entities.customer

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.entities.base.BaseChangeTrackingEntity
import at.wrk.tafel.admin.backend.database.entities.base.EmployeeEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table

@Entity(name = "CustomerNote")
@Table(name = "customers_notes")
@ExcludeFromTestCoverage
class CustomerNoteEntity : BaseChangeTrackingEntity() {

    @ManyToOne
    @JoinColumn(name = "customer_id", nullable = false)
    var customer: CustomerEntity? = null

    @ManyToOne
    @JoinColumn(name = "employee_id", nullable = true)
    var employee: EmployeeEntity? = null

    @Column(name = "note")
    var note: String? = null

}
