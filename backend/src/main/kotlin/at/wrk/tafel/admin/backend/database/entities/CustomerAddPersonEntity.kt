package at.wrk.tafel.admin.backend.database.entities

import at.wrk.tafel.admin.backend.database.entities.base.BaseChangeTrackingEntity
import java.math.BigDecimal
import java.time.LocalDate
import javax.persistence.*

@Entity(name = "CustomerAddPerson")
@Table(name = "customers_addpersons")
class CustomerAddPersonEntity : BaseChangeTrackingEntity() {
    @ManyToOne
    @JoinColumn(name = "customer_id", nullable = false)
    var customer: CustomerEntity? = null

    @Column(name = "firstname")
    var firstname: String? = null

    @Column(name = "lastname")
    var lastname: String? = null

    @Column(name = "birth_date")
    var birthDate: LocalDate? = null

    @Column(name = "income")
    var income: BigDecimal? = null

    @Column(name = "incomeDue")
    var incomeDue: LocalDate? = null
}
