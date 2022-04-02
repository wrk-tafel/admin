package at.wrk.tafel.admin.backend.database.entities.staticdata

import at.wrk.tafel.admin.backend.database.entities.base.BaseEntity
import javax.persistence.Column
import javax.persistence.Entity
import javax.persistence.Table

@Entity(name = "Country")
@Table(name = "static_countries")
class CountryEntity : BaseEntity() {
    @Column(name = "code")
    var code: String? = null

    @Column(name = "name")
    var name: String? = null
}
