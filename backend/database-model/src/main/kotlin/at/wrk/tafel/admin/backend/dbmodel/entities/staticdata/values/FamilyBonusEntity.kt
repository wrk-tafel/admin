package at.wrk.tafel.admin.backend.dbmodel.entities.staticdata.values

import javax.persistence.Column
import javax.persistence.DiscriminatorValue
import javax.persistence.Entity

@Entity(name = "FamilyBonus")
@DiscriminatorValue("FAMILY-BONUS")
class FamilyBonusEntity : StaticValueEntity() {
    @Column(name = "age")
    var age: Int? = null
}
