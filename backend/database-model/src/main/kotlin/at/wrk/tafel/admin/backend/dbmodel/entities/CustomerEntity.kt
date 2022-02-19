package at.wrk.tafel.admin.backend.dbmodel.entities

import java.time.LocalDate
import javax.persistence.*

@Entity
@Table(name = "customer")
class CustomerEntity {
    @Id
    @Column(name = "id", nullable = false)
    var id: Long? = null

    @Column(name = "customer_id")
    var customerId: Long? = null

    @Column(name = "firstname")
    var firstname: String? = null

    @Column(name = "lastname")
    var lastname: String? = null

    @Column(name = "gender")
    @Enumerated(EnumType.STRING)
    var gender: CustomerGender? = null

    @Column(name = "birth_date")
    var birthDate: LocalDate? = null

    @Column(name = "telephone_number")
    var telephoneNumber: Long? = null

    @Column(name = "email")
    var email: String? = null
}
// TODO  : BaseChangeTrackingEntity<Long>(id, version)

enum class CustomerGender {
    MALE, FEMALE
}
