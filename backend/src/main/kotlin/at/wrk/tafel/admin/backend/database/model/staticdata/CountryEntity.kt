package at.wrk.tafel.admin.backend.database.model.staticdata

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.base.BaseEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table

@Entity(name = "Country")
@Table(name = "static_countries")
@ExcludeFromTestCoverage
class CountryEntity(
    @Column(name = "code")
    var code: String,
    @Column(name = "name")
    var name: String,
    @Column(name = "enabled")
    var enabled: Boolean = true,
) : BaseEntity()
