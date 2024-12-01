package at.wrk.tafel.admin.backend.database.model.logistics

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import jakarta.persistence.Column
import jakarta.persistence.Embeddable

@Embeddable
@ExcludeFromTestCoverage
class ShopAddress {

    @Column(name = "address_postal_code")
    var postalCode: Int? = null

    @Column(name = "address_street")
    var street: String? = null

    @Column(name = "address_city")
    var city: String? = null

}
