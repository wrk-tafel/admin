package at.wrk.tafel.admin.backend.database.entities.staticdata

import jakarta.persistence.Column
import jakarta.persistence.DiscriminatorValue
import jakarta.persistence.Entity
import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage

@Entity(name = "SiblingAddition")
@DiscriminatorValue("SIBLING-ADDITION")
@ExcludeFromTestCoverage
class SiblingAdditionEntity : StaticValueEntity() {
    @Column(name = "count_child")
    var countChild: Int? = null
}
