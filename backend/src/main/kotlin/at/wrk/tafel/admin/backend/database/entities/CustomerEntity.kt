package at.wrk.tafel.admin.backend.database.entities

import at.wrk.tafel.admin.backend.database.entities.base.BaseChangeTrackingEntity
import java.time.LocalDate
import javax.persistence.Column
import javax.persistence.Entity
import javax.persistence.Table

@Entity(name = "Customer")
@Table(name = "customers")
class CustomerEntity : BaseChangeTrackingEntity() {
    @Column(name = "firstname")
    var firstname: String? = null

    @Column(name = "lastname")
    var lastname: String? = null

    @Column(name = "birth_date")
    var birthDate: LocalDate? = null

    @Column(name = "address_street")
    var addressStreet: String? = null

    @Column(name = "address_houseNumber")
    var addressHouseNumber: String? = null

    @Column(name = "address_stairway")
    var addressStairway: String? = null

    @Column(name = "address_postalCode")
    var addressPostalCode: Int? = null

    @Column(name = "address_city")
    var addressCity: String? = null

    @Column(name = "telephone_number")
    var telephoneNumber: Long? = null

    @Column(name = "email")
    var email: String? = null

    @Column(name = "count_persons_in_household")
    var countPersonsInHousehold: Int? = null

    @Column(name = "count_infants")
    var countInfants: Int? = null
}
