package at.wrk.tafel.admin.backend.database.model.customer

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.base.BaseChangeTrackingEntity
import at.wrk.tafel.admin.backend.database.model.base.Gender
import at.wrk.tafel.admin.backend.database.model.staticdata.CountryEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import java.math.BigDecimal
import java.time.LocalDate

@Entity(name = "CustomerAddPerson")
@Table(name = "customers_addpersons")
@ExcludeFromTestCoverage
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

    @Column(name = "gender")
    @Enumerated(EnumType.STRING)
    var gender: Gender? = null

    @Column(name = "employer")
    var employer: String? = null

    @Column(name = "income")
    var income: BigDecimal? = null

    @Column(name = "incomeDue")
    var incomeDue: LocalDate? = null

    @ManyToOne
    var country: CountryEntity? = null

    @Column(name = "exclude_household")
    var excludeFromHousehold: Boolean? = null

    @Column(name = "receives_familybonus")
    var receivesFamilyBonus: Boolean? = null
}
