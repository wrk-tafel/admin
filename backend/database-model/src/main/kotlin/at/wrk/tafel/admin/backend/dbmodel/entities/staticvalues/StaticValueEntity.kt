package at.wrk.tafel.admin.backend.dbmodel.entities.staticvalues

import at.wrk.tafel.admin.backend.dbmodel.common.BaseChangeTrackingEntity
import java.math.BigDecimal
import java.time.LocalDate
import javax.persistence.*

@Entity
@Table(name = "static_values")
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name = "type", discriminatorType = DiscriminatorType.STRING)
abstract class StaticValueEntity : BaseChangeTrackingEntity() {
    @Column(name = "value")
    var value: BigDecimal? = null

    @Column(name = "valid_from")
    var validFrom: LocalDate? = null

    @Column(name = "valid_to")
    var validTo: LocalDate? = null
}
