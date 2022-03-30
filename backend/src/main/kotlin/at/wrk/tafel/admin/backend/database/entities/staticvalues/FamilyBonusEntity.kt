package at.wrk.tafel.admin.backend.database.entities.staticvalues

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import javax.persistence.Column
import javax.persistence.DiscriminatorValue
import javax.persistence.Entity

@Entity(name = "FamilyBonus")
@DiscriminatorValue("FAMILY-BONUS")
@ExcludeFromTestCoverage
class FamilyBonusEntity : StaticValueEntity() {
    @Column(name = "age")
    var age: Int? = null
}
