package at.wrk.tafel.admin.backend.database.model.staticdata

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.base.BaseEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Table
import java.math.BigDecimal
import java.time.LocalDate

@Entity(name = "StaticValue")
@Table(name = "static_values")
@ExcludeFromTestCoverage
class StaticValueEntity(
    @Column(name = "valid_from")
    var validFrom: LocalDate,
    @Column(name = "valid_to")
    var validTo: LocalDate,
    @Column(name = "type")
    @Enumerated(EnumType.STRING)
    var type: StaticValueType,
    @Column(name = "amount")
    var amount: BigDecimal,
) : BaseEntity() {
    @Column(name = "count_adults")
    var countAdults: Int? = null

    @Column(name = "count_children")
    var countChildren: Int? = null

    /**
     * Lower bound of an age bracket, for the types keyed by age ([StaticValueType.FAMILY_ALLOWANCE]).
     * A row applies "from age [age] on", up to the next higher tier - the seeded Familienbeihilfe
     * rows (0/3/10/19) mirror the Austrian rate card, where the amount rises with the child's age.
     */
    @Column(name = "age")
    var age: Int? = null
}

enum class StaticValueType {
    INCOME_LIMIT,
    ADDITIONAL_ADULT,
    ADDITIONAL_CHILD,
    TOLERANCE,
    FAMILY_ALLOWANCE,
    CHILD_TAX_ALLOWANCE,
    SIBLING_ADDITION,
    COST_CONTRIBUTION,
}
