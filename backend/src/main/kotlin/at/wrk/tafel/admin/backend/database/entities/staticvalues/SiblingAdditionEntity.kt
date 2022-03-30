package at.wrk.tafel.admin.backend.database.entities.staticvalues

import javax.persistence.Column
import javax.persistence.DiscriminatorValue
import javax.persistence.Entity

@Entity(name = "SiblingAddition")
@DiscriminatorValue("SIBLING-ADDITION")
class SiblingAdditionEntity : StaticValueEntity() {
    @Column(name = "count_child")
    var countChild: Int? = null
}
