package at.wrk.tafel.admin.backend.database.entities.staticdata

import at.wrk.tafel.admin.backend.database.entities.base.BaseChangeTrackingEntity
import jakarta.persistence.*
import java.math.BigDecimal
import java.time.LocalDate
import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage

@Entity
@Table(name = "static_values")
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name = "type", discriminatorType = DiscriminatorType.STRING)
@ExcludeFromTestCoverage
abstract class StaticValueEntity : BaseChangeTrackingEntity() {
    @Column(name = "amount")
    open var amount: BigDecimal? = null

    @Column(name = "valid_from")
    open var validFrom: LocalDate? = null

    @Column(name = "valid_to")
    open var validTo: LocalDate? = null
}
