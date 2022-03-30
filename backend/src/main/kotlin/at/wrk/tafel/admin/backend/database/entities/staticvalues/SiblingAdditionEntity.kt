package at.wrk.tafel.admin.backend.database.entities.staticvalues

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import javax.persistence.Column
import javax.persistence.DiscriminatorValue
import javax.persistence.Entity

@Entity(name = "SiblingAddition")
@DiscriminatorValue("SIBLING-ADDITION")
@ExcludeFromTestCoverage
class SiblingAdditionEntity : StaticValueEntity() {
    @Column(name = "count_child")
    var countChild: Int? = null
}
