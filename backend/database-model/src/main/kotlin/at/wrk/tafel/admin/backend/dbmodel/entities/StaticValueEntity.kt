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
    val countChilds: Int = 0,
    val age: Int? = null
) {
    INCPERS1(countPersons = 1),
    INCPERS1CH1(countPersons = 1, countChilds = 1),
    INCPERS1CH2(countPersons = 1, countChilds = 2),
    INCPERS2(countPersons = 2),
    INCPERS2CH1(countPersons = 2, countChilds = 1),
    INCPERS2CH2(countPersons = 2, countChilds = 2),
    INCPERS2CH3(countPersons = 2, countChilds = 3),
    INCADDADULT,
    INCADDCHILD,
    INCFAMBONAGE0(age = 0),
    INCFAMBONAGE3(age = 3),
    INCFAMBONAGE10(age = 10),
    INCFAMBONAGE19(age = 19);

    companion object {
        fun valueOfCounts(countPersons: Int? = 0, countChilds: Int? = 0): StaticValueType? {
            for (value in values()) {
                if (value.countPersons == countPersons && value.countChilds == countChilds) {
                    return value
                }
            }
            return null
        }

        fun valueOfAge(age: Int): StaticValueType? {
            val ageValuesSorted = listOf(*values()).sortedByDescending { it.age }
            for (value in ageValuesSorted) {
                val valueAge = value.age
                if (valueAge != null && age >= valueAge) {
                    return value
                }
            }
            return null
        }
    }
}
