package at.wrk.tafel.admin.backend.database.entities.staticdata

import jakarta.persistence.Column
import jakarta.persistence.DiscriminatorValue
import jakarta.persistence.Entity

@Entity(name = "FamilyBonus")
@DiscriminatorValue("FAMILY-BONUS")
class FamilyBonusEntity : StaticValueEntity() {
    @Column(name = "age")
    var age: Int? = null
}
