package at.wrk.tafel.admin.backend.database.entities.staticdata

import javax.persistence.Column
import javax.persistence.DiscriminatorValue
import javax.persistence.Entity

@Entity(name = "IncomeLimit")
@DiscriminatorValue("INCOME-LIMIT")
class IncomeLimitEntity : StaticValueEntity() {
    @Column(name = "count_adult")
    var countAdult: Int? = null

    @Column(name = "count_child")
    var countChild: Int? = null

    @Column(name = "additional_adult")
    var additionalAdult: Boolean? = null

    @Column(name = "additional_child")
    var additionalChild: Boolean? = null
}
