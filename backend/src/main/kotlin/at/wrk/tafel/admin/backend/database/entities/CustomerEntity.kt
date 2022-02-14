package at.wrk.tafel.admin.backend.database.entities

import at.wrk.tafel.admin.backend.database.common.BaseChangeTrackingEntity
import java.time.LocalDate
import javax.persistence.*

@Entity
@Table(name = "customer")
class CustomerEntity(
    id: Long,
    version: Long,

    @Column(name = "customer_number")
    var customerNumber: Long,

    @Column(name = "firstname")
    var firstname: String,

    @Column(name = "lastname")
    var lastname: String,

    @Column(name = "gender")
    @Enumerated(EnumType.STRING)
    var gender: CustomerGender,

    @Column(name = "birth_date")
    var birthDate: LocalDate,

    @Column(name = "telephone_number")
    var telephoneNumber: Long,

    @Column(name = "email")
    var email: String
) : BaseChangeTrackingEntity<Long>(id, version)

enum class CustomerGender {
    MALE, FEMALE
}
