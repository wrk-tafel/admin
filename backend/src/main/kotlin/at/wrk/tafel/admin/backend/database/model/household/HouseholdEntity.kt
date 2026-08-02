package at.wrk.tafel.admin.backend.database.model.household

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.base.BaseChangeTrackingEntity
import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity
import at.wrk.tafel.admin.backend.database.model.base.Gender
import at.wrk.tafel.admin.backend.database.model.person.PersonEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.CountryEntity
import jakarta.persistence.CascadeType
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.OneToMany
import jakarta.persistence.OneToOne
import jakarta.persistence.Table
import jakarta.persistence.criteria.CriteriaBuilder
import jakarta.persistence.criteria.CriteriaQuery
import jakarta.persistence.criteria.Expression
import jakarta.persistence.criteria.Join
import jakarta.persistence.criteria.JoinType
import jakarta.persistence.criteria.Root
import jakarta.persistence.criteria.Subquery
import org.springframework.data.jpa.domain.Specification
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime

/**
 * The "case" record - business number, address, contact data, validity/lock/cost-contribution state
 * and the issuing employee. The people belonging to it live in [PersonEntity]; exactly one of them
 * is the main person, pointed at by [mainPerson].
 *
 * Note: `main_person_id` is intentionally nullable at the schema level. `households` and `persons`
 * reference each other, so a brand-new household + its main person can never be inserted if both
 * directions were `NOT NULL`. New households are therefore always persisted in two steps
 * (household with `mainPerson = null` -> persons -> set `mainPerson`), see `HouseholdService`.
 */
@Entity(name = "Household")
@Table(name = "households")
@ExcludeFromTestCoverage
class HouseholdEntity : BaseChangeTrackingEntity() {

    @Column(name = "household_id")
    var householdId: Long? = null

    @ManyToOne
    @JoinColumn(name = "employee_id")
    var issuer: EmployeeEntity? = null

    @OneToOne
    @JoinColumn(name = "main_person_id")
    var mainPerson: PersonEntity? = null

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

    @Column(name = "valid_until")
    var validUntil: LocalDate? = null

    @Column(name = "locked")
    var locked: Boolean? = null

    @Column(name = "locked_at")
    var lockedAt: LocalDateTime? = null

    @Column(name = "prolonged_at")
    var prolongedAt: LocalDateTime? = null

    @ManyToOne
    @JoinColumn(name = "locked_by")
    var lockedBy: UserEntity? = null

    @Column(name = "lock_reason")
    var lockReason: String? = null

    @Column(name = "migrated")
    var migrated: Boolean? = null

    @Column(name = "pending_cost_contribution")
    var pendingCostContribution: BigDecimal = BigDecimal.ZERO

    @Column(name = "single_parent")
    var singleParent: Boolean? = null

    @OneToMany(mappedBy = "household", cascade = [CascadeType.ALL], orphanRemoval = true)
    var persons: MutableList<PersonEntity> = mutableListOf()

    /**
     * All household members except the main person - the direct equivalent of the former
     * `CustomerEntity.additionalPersons`.
     */
    fun additionalPersons(): List<PersonEntity> = persons.filterNot { it.isMainPerson }

    interface Specs {
        companion object {
            fun firstnameContains(firstname: String?): Specification<HouseholdEntity>? = firstname?.let {
                Specification { root: Root<HouseholdEntity>, _: CriteriaQuery<*>?, cb: CriteriaBuilder ->
                    val mainPerson = root.join<HouseholdEntity, PersonEntity>("mainPerson", JoinType.LEFT)
                    cb.like(
                        cb.lower(mainPerson["firstname"]),
                        "%${firstname.lowercase()}%",
                    )
                }
            }

            fun lastnameContains(lastname: String?): Specification<HouseholdEntity>? = lastname?.let {
                Specification { root: Root<HouseholdEntity>, _: CriteriaQuery<*>?, cb: CriteriaBuilder ->
                    val mainPerson = root.join<HouseholdEntity, PersonEntity>("mainPerson", JoinType.LEFT)
                    cb.like(
                        cb.lower(mainPerson["lastname"]),
                        "%${lastname.lowercase()}%",
                    )
                }
            }

            fun postProcessingNecessary(): Specification<HouseholdEntity> = Specification { root: Root<HouseholdEntity>, cq: CriteriaQuery<*>?, cb: CriteriaBuilder ->

                // any person of the household with incomplete master data
                val subQuery: Subquery<Long> = cq!!.subquery(Long::class.java)
                val subRoot: Root<PersonEntity> = subQuery.from(PersonEntity::class.java)
                val subHousehold: Join<PersonEntity, HouseholdEntity> = subRoot.join("household")

                val subBirthDate: Expression<LocalDate> = subRoot["birthDate"]
                val subGender: Expression<Gender> = subRoot["gender"]

                subQuery.select(subHousehold["id"]).distinct(true)
                    .where(
                        cb.or(
                            cb.isNull(subBirthDate),
                            cb.isNull(subGender),
                        ),
                    )

                val mainPerson = root.join<HouseholdEntity, PersonEntity>("mainPerson", JoinType.LEFT)
                val lastname: Expression<String> = mainPerson["lastname"]
                val firstname: Expression<String> = mainPerson["firstname"]
                val birthDate: Expression<LocalDate> = mainPerson["birthDate"]
                val gender: Expression<Gender> = mainPerson["gender"]
                val country: Expression<CountryEntity> = mainPerson["country"]
                val employer: Expression<String> = mainPerson["employer"]

                val addressStreet: Expression<String> = root["addressStreet"]
                val addressHouseNumber: Expression<String> = root["addressHouseNumber"]
                val addressPostalCode: Expression<String> = root["addressPostalCode"]
                val addressCity: Expression<String> = root["addressCity"]
                val id: Expression<Long> = root["id"]

                cb.or(
                    cb.isNull(lastname),
                    cb.isNull(firstname),
                    cb.isNull(birthDate),
                    cb.isNull(gender),
                    cb.isNull(country),
                    cb.isNull(addressStreet),
                    cb.isNull(addressHouseNumber),
                    cb.isNull(addressPostalCode),
                    cb.isNull(addressCity),
                    cb.isNull(employer),
                    id.`in`(subQuery),
                )
            }

            fun pendingCostContribution(): Specification<HouseholdEntity> = Specification { root: Root<HouseholdEntity>, _: CriteriaQuery<*>?, cb: CriteriaBuilder ->
                val pendingCostContribution: Expression<BigDecimal> = root["pendingCostContribution"]
                cb.greaterThan(pendingCostContribution, BigDecimal.ZERO)
            }

            fun orderByUpdatedAtDesc(spec: Specification<HouseholdEntity>): Specification<HouseholdEntity> = Specification { root: Root<HouseholdEntity>, cq: CriteriaQuery<*>?, cb: CriteriaBuilder ->
                val updatedAt: Expression<LocalDate> = root["updatedAt"]
                val id: Expression<Long> = root["id"]

                cq!!.orderBy(cb.desc(updatedAt), cb.desc(id))
                spec.toPredicate(root, cq, cb)
            }

            fun validHousehold(): Specification<HouseholdEntity> = Specification { root: Root<HouseholdEntity>, _: CriteriaQuery<*>?, cb: CriteriaBuilder ->
                val validUntil: Expression<LocalDate> = root["validUntil"]
                cb.and(
                    cb.isNotNull(validUntil),
                    cb.greaterThanOrEqualTo(validUntil, LocalDate.now()),
                )
            }
        }
    }
}
