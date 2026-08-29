package at.wrk.tafel.admin.backend.database.model.base

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table
import jakarta.persistence.criteria.CriteriaBuilder
import jakarta.persistence.criteria.CriteriaQuery
import jakarta.persistence.criteria.Expression
import jakarta.persistence.criteria.Root
import org.springframework.data.jpa.domain.Specification

@Entity(name = "Employee")
@Table(name = "employees")
@ExcludeFromTestCoverage
class EmployeeEntity(
    @Column(name = "personnel_number")
    var personnelNumber: String,
    @Column(name = "firstname")
    var firstname: String,
    @Column(name = "lastname")
    var lastname: String,
) : BaseChangeTrackingEntity() {

    interface Specs {
        companion object {
            fun searchInputMatches(searchInput: String?): Specification<EmployeeEntity>? = searchInput?.let {
                Specification { root: Root<EmployeeEntity>, _: CriteriaQuery<*>?, cb: CriteriaBuilder ->
                    val pattern = "%${it.lowercase()}%"
                    cb.or(
                        cb.like(cb.lower(root["personnelNumber"]), pattern),
                        cb.like(cb.lower(root["firstname"]), pattern),
                        cb.like(cb.lower(root["lastname"]), pattern),
                    )
                }
            }

            /**
             * `id` ascending by default - the order the screen has always shown. A [sortBy]/
             * [sortDirection] pair - a user clicking a sortable `mat-sort-header` column on the
             * employees screen - overrides that, the same way `UserEntity.Specs.orderBySearchRelevance`
             * does. [sortBy] takes the same column ids the frontend's `mat-sort-header`s use
             * (`personnelNumber`, `firstname`, `lastname`); an unrecognized or missing value falls back
             * to `id`. `id` still closes out the order so paging stays stable when two employees tie on
             * the requested column.
             */
            fun orderById(
                spec: Specification<EmployeeEntity>,
                sortBy: String? = null,
                sortDirection: String? = null,
            ): Specification<EmployeeEntity> = Specification { root: Root<EmployeeEntity>, cq: CriteriaQuery<*>?, cb: CriteriaBuilder ->
                val id: Expression<Long> = root["id"]
                val personnelNumber: Expression<String> = root["personnelNumber"]
                val firstname: Expression<String> = root["firstname"]
                val lastname: Expression<String> = root["lastname"]
                val ascending = "asc".equals(sortDirection, ignoreCase = true)

                fun <T> CriteriaBuilder.orderBy(expression: Expression<T>) = if (ascending) asc(expression) else desc(expression)

                val orders = buildList {
                    when (sortBy) {
                        "personnelNumber" -> add(cb.orderBy(personnelNumber))
                        "firstname" -> add(cb.orderBy(firstname))
                        "lastname" -> add(cb.orderBy(lastname))
                    }
                    add(cb.asc(id))
                }
                cq!!.orderBy(orders)
                spec.toPredicate(root, cq, cb)
            }
        }
    }
}
