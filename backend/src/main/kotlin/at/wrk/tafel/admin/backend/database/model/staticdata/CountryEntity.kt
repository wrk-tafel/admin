package at.wrk.tafel.admin.backend.database.model.staticdata

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.base.BaseEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table

@Entity(name = "Country")
@Table(name = "static_countries")
@ExcludeFromTestCoverage
class CountryEntity : BaseEntity() {
    @Column(name = "code")
    var code: String? = null

    @Column(name = "name")
    var name: String? = null
}
