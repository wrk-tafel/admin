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
import jakarta.persistence.criteria.CriteriaBuilder
import jakarta.persistence.criteria.CriteriaQuery
import jakarta.persistence.criteria.Expression
import jakarta.persistence.criteria.Join
import jakarta.persistence.criteria.Root
import org.springframework.data.jpa.domain.Specification
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
class PersonEntity(
    @ManyToOne
    @JoinColumn(name = "household_id", nullable = false)
    var household: HouseholdEntity,
    @ManyToOne
    @JoinColumn(name = "country_id", nullable = false)
    var country: CountryEntity,
    @Column(name = "is_main_person", nullable = false)
    var isMainPerson: Boolean = false,
) : BaseChangeTrackingEntity() {

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

    @Column(name = "income_due")
    var incomeDue: LocalDate? = null

    @Column(name = "exclude_household", nullable = false)
    var excludeFromHousehold: Boolean = false

    @Column(name = "receives_family_allowance", nullable = false)
    var receivesFamilyAllowance: Boolean = false

    interface Specs {
        companion object {
            fun isAdditionalPerson(): Specification<PersonEntity> = Specification { root: Root<PersonEntity>, _: CriteriaQuery<*>?, cb: CriteriaBuilder ->
                cb.isFalse(root.get("isMainPerson"))
            }

            /**
             * `birthDate` is a plain stored column - filtering by a min/max *age* is expressed here
             * as a `birthDate` range instead of computing age in the query (e.g. via Postgres'
             * `age()`), so it stays portable and index-friendly. See callers for the age-to-date
             * range math.
             */
            fun birthDateBetween(from: LocalDate, to: LocalDate): Specification<PersonEntity> = Specification { root: Root<PersonEntity>, _: CriteriaQuery<*>?, cb: CriteriaBuilder ->
                val birthDate: Expression<LocalDate> = root["birthDate"]
                cb.between(birthDate, from, to)
            }

            fun householdIsValid(): Specification<PersonEntity> = Specification { root: Root<PersonEntity>, _: CriteriaQuery<*>?, cb: CriteriaBuilder ->
                val household = root.join<PersonEntity, HouseholdEntity>("household")
                val validUntil: Expression<LocalDate> = household["validUntil"]
                cb.and(
                    cb.isNotNull(validUntil),
                    cb.greaterThanOrEqualTo(validUntil, LocalDate.now()),
                )
            }

            fun orderByHouseholdId(spec: Specification<PersonEntity>): Specification<PersonEntity> = Specification { root: Root<PersonEntity>, cq: CriteriaQuery<*>?, cb: CriteriaBuilder ->
                val household: Join<PersonEntity, HouseholdEntity> = root.join("household")
                val householdId: Expression<Long> = household["householdId"]
                val id: Expression<Long> = root["id"]

                cq!!.orderBy(cb.asc(householdId), cb.desc(id))
                spec.toPredicate(root, cq, cb)
            }
        }
    }
}
