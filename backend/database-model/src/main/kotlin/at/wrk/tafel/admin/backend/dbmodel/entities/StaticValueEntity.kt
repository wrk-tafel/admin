package at.wrk.tafel.admin.backend.dbmodel.entities

import at.wrk.tafel.admin.backend.dbmodel.common.BaseChangeTrackingEntity
import java.math.BigDecimal
import java.time.LocalDate
import javax.persistence.*

@Entity(name = "StaticValue")
@Table(name = "static_values")
class StaticValueEntity : BaseChangeTrackingEntity() {
    @Column(name = "type")
    @Enumerated(EnumType.STRING)
    var type: StaticValueType? = null

    @Column(name = "value")
    var value: BigDecimal? = null

    @Column(name = "valid_from")
    var validFrom: LocalDate? = null

    @Column(name = "valid_to")
    var validTo: LocalDate? = null
}

enum class StaticValueType(
    val countPersons: Int = 0,
    val countChilds: Int = 0
) {
    PERS1(countPersons = 1),
    PERS1CH1(countPersons = 1, countChilds = 1),
    PERS1CH2(countPersons = 1, countChilds = 2),
    PERS2(countPersons = 2),
    PERS2CH1(countPersons = 2, countChilds = 1),
    PERS2CH2(countPersons = 2, countChilds = 2),
    PERS2CH3(countPersons = 2, countChilds = 3),
    ADDADULT,
    ADDCHILD;

    companion object {
        fun valueOfCount(countPersons: Int? = 0, countChilds: Int? = 0): StaticValueType? {
            for (value in values()) {
                if (value.countPersons == countPersons && value.countChilds == countChilds) {
                    return value
                }
            }
            return null
        }
    }
}
