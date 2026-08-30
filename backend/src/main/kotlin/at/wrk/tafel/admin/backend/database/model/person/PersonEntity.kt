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

            /**
             * Ordered by household by default, so a household's children stay adjacent and the
             * children-statistics screen can show its number just once per group (see
             * `StatisticsChildrenComponent`'s `firstOfHousehold`).
             *
             * A [sortBy]/[sortDirection] pair - a user clicking a sortable `mat-sort-header` column on
             * that screen - overrides this entirely, the same way
             * `UserEntity.Specs.orderBySearchRelevance` does: children then simply sort by the chosen
             * column across households, and the screen's per-household grouping no longer applies to
             * consecutive rows (nothing breaks - the household number is just shown on every row rather
             * than once per group). [sortBy] takes the same column ids the frontend's `mat-sort-header`s
             * use (`householdId`, `firstname`, `lastname`, `age`); an unrecognized or missing value
             * falls back to the household default. `age` is derived from [PersonEntity.birthDate] at
             * query time (older == smaller birth date), so it sorts by the inverse of [sortDirection] on
             * that column. `id` still closes out the order so paging stays stable when two rows tie on
             * the requested column.
             */
            fun orderByHouseholdId(
                spec: Specification<PersonEntity>,
                sortBy: String? = null,
                sortDirection: String? = null,
            ): Specification<PersonEntity> = Specification { root: Root<PersonEntity>, cq: CriteriaQuery<*>?, cb: CriteriaBuilder ->
                val household: Join<PersonEntity, HouseholdEntity> = root.join("household")
                val householdId: Expression<Long> = household["householdId"]
                val firstname: Expression<String> = root["firstname"]
                val lastname: Expression<String> = root["lastname"]
                val birthDate: Expression<LocalDate> = root["birthDate"]
                val id: Expression<Long> = root["id"]
                val ascending = "asc".equals(sortDirection, ignoreCase = true)

                fun <T> CriteriaBuilder.orderBy(expression: Expression<T>) = if (ascending) asc(expression) else desc(expression)

                val orders = buildList {
                    when (sortBy) {
                        "householdId" -> add(cb.orderBy(householdId))
                        "firstname" -> add(cb.orderBy(firstname))
                        "lastname" -> add(cb.orderBy(lastname))
                        // Older children have an earlier birth date, so ascending age is descending birthDate.
                        "age" -> add(if (ascending) cb.desc(birthDate) else cb.asc(birthDate))
                        else -> add(cb.asc(householdId))
                    }
                    add(cb.desc(id))
                }
                cq!!.orderBy(orders)
                spec.toPredicate(root, cq, cb)
            }
        }
    }
}
