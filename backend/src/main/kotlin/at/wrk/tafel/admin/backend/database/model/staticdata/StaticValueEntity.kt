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
class StaticValueEntity : BaseEntity() {
    @Column(name = "valid_from")
    var validFrom: LocalDate? = null

    @Column(name = "valid_to")
    var validTo: LocalDate? = null

    @Column(name = "type")
    @Enumerated(EnumType.STRING)
    var type: StaticValueType? = null

    @Column(name = "amount")
    var amount: BigDecimal? = null

    @Column(name = "count_adults")
    var countAdults: Int? = null

    @Column(name = "count_children")
    var countChildren: Int? = null

    @Column(name = "age")
    var age: Int? = null
}

enum class StaticValueType {
    INCOME_LIMIT,
    ADDITIONAL_ADULT,
    ADDITIONAL_CHILD,
    TOLERANCE,
    FAMILY_BONUS,
    CHILD_TAX_ALLOWANCE,
    SIBLING_ADDITION,
    COST_CONTRIBUTION,
}
