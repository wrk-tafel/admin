package at.wrk.tafel.admin.backend.dbmodel.entities.staticvalues

import javax.persistence.Column
import javax.persistence.DiscriminatorValue
import javax.persistence.Entity

@Entity(name = "IncomeLimit")
@DiscriminatorValue("INCOME-LIMIT")
class IncomeLimitEntity : StaticValueEntity() {
    @Column(name = "count_persons")
    var countAdult: Int? = null

    @Column(name = "count_child")
    var countChild: Int? = null

    @Column(name = "additional_adult")
    var additionalAdult: Boolean? = null

    @Column(name = "additional_child")
    var additionalChild: Boolean? = null
}
