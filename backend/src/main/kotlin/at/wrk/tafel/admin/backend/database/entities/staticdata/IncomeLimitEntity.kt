package at.wrk.tafel.admin.backend.database.entities.staticdata

import jakarta.persistence.Column
import jakarta.persistence.DiscriminatorValue
import jakarta.persistence.Entity

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
