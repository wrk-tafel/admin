package at.wrk.tafel.admin.backend.database.entities.customer

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.entities.auth.UserEntity
import at.wrk.tafel.admin.backend.database.entities.base.BaseChangeTrackingEntity
import jakarta.persistence.*

@Entity(name = "CustomerNote")
@Table(name = "customers_notes")
@ExcludeFromTestCoverage
class CustomerNoteEntity : BaseChangeTrackingEntity() {

    @ManyToOne
    @JoinColumn(name = "customer_id", nullable = false)
    var customer: CustomerEntity? = null

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = true)
    var user: UserEntity? = null

    @Column(name = "note")
    var note: String? = null

}
