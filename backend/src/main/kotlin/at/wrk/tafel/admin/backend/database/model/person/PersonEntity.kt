package at.wrk.tafel.admin.backend.database.model.person

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.base.BaseChangeTrackingEntity
import at.wrk.tafel.admin.backend.database.model.base.Gender
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
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

/**
 * A single member of a household - including the main person, which is flagged via [isMainPerson].
 * Replaces the former `CustomerAddPersonEntity` plus the person-related fields that used to live
 * directly on `CustomerEntity`.
 */
@Entity(name = "Person")
@Table(name = "persons")
@ExcludeFromTestCoverage
class PersonEntity : BaseChangeTrackingEntity() {

    @ManyToOne
    @JoinColumn(name = "household_id", nullable = false)
    var household: HouseholdEntity? = null

    @Column(name = "is_main_person", nullable = false)
    var isMainPerson: Boolean = false

    @Column(name = "firstname")
    var firstname: String? = null

    @Column(name = "lastname")
    var lastname: String? = null

    @Column(name = "birth_date")
    var birthDate: LocalDate? = null

    @Column(name = "gender")
    @Enumerated(EnumType.STRING)
    var gender: Gender? = null

    @ManyToOne
    @JoinColumn(name = "country_id")
    var country: CountryEntity? = null

    @Column(name = "employer")
    var employer: String? = null

    @Column(name = "income")
    var income: BigDecimal? = null

    @Column(name = "income_due")
    var incomeDue: LocalDate? = null

    @Column(name = "exclude_household", nullable = false)
    var excludeFromHousehold: Boolean = false

    @Column(name = "receives_familybonus", nullable = false)
    var receivesFamilyBonus: Boolean = false

}
