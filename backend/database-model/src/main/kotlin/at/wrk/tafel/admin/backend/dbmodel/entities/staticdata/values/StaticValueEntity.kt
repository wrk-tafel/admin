package at.wrk.tafel.admin.backend.dbmodel.entities.staticdata.values

import at.wrk.tafel.admin.backend.dbmodel.common.BaseChangeTrackingEntity
import java.math.BigDecimal
import java.time.LocalDate
import javax.persistence.*

@Entity
@Table(name = "static_values")
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name = "type", discriminatorType = DiscriminatorType.STRING)
abstract class StaticValueEntity : BaseChangeTrackingEntity() {
    @Column(name = "amount")
    open var amount: BigDecimal? = null

    @Column(name = "valid_from")
    open var validFrom: LocalDate? = null

    @Column(name = "valid_to")
    open var validTo: LocalDate? = null
}
