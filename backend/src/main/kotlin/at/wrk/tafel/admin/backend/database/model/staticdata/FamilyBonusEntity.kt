package at.wrk.tafel.admin.backend.database.model.staticdata

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import jakarta.persistence.Column
import jakarta.persistence.DiscriminatorValue
import jakarta.persistence.Entity

@Entity(name = "FamilyBonus")
@DiscriminatorValue("FAMILY-BONUS")
@ExcludeFromTestCoverage
class FamilyBonusEntity : StaticValueEntity() {
    @Column(name = "age")
    var age: Int? = null
}
