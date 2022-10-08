package at.wrk.tafel.admin.backend.database.entities

import at.wrk.tafel.admin.backend.database.entities.base.BaseChangeTrackingEntity
import at.wrk.tafel.admin.backend.database.entities.staticdata.CountryEntity
import java.math.BigDecimal
import java.time.LocalDate
import javax.persistence.*

@Entity(name = "Customer")
@Table(name = "customers")
class CustomerEntity : BaseChangeTrackingEntity() {
    @Column(name = "customer_id")
    var customerId: Long? = null

    @Column(name = "firstname")
    var firstname: String? = null

    @Column(name = "lastname")
    var lastname: String? = null

    @Column(name = "birth_date")
    var birthDate: LocalDate? = null

    @ManyToOne
    var country: CountryEntity? = null

    @Column(name = "address_street")
    var addressStreet: String? = null

    @Column(name = "address_housenumber")
    var addressHouseNumber: String? = null

    @Column(name = "address_stairway")
    var addressStairway: String? = null

    @Column(name = "address_postalcode")
    var addressPostalCode: Int? = null

    @Column(name = "address_door")
    var addressDoor: String? = null

    @Column(name = "address_city")
    var addressCity: String? = null

    @Column(name = "telephone_number")
    var telephoneNumber: String? = null

    @Column(name = "email")
    var email: String? = null

    @Column(name = "employer")
    var employer: String? = null

    @Column(name = "income")
    var income: BigDecimal? = null

    @Column(name = "incomeDue")
    var incomeDue: LocalDate? = null

    @Column(name = "valid_until")
    var validUntil: LocalDate? = null

    @OneToMany(mappedBy = "customer", cascade = [CascadeType.ALL], orphanRemoval = true)
    var additionalPersons: MutableList<CustomerAddPersonEntity> = mutableListOf()
}
