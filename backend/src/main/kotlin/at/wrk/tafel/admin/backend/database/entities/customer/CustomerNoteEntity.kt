package at.wrk.tafel.admin.backend.database.entities.customer

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.entities.auth.UserEntity
import at.wrk.tafel.admin.backend.database.entities.base.BaseChangeTrackingEntity
import jakarta.persistence.*

@Entity(name = "CustomerNote")
@Table(name = "customers_notes")
@ExcludeFromTestCoverage
class CustomerNoteEntity : BaseChangeTrackingEntity() {

    @Column(name = "customer_id")
    var customerId: Long? = null

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    var user: UserEntity? = null

    @Column(name = "note")
    var note: String? = null

}
