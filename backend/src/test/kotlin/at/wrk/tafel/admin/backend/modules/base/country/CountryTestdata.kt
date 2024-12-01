package at.wrk.tafel.admin.backend.modules.base.country

import at.wrk.tafel.admin.backend.database.model.staticdata.CountryEntity

val testCountry = CountryEntity().apply {
    id = 1
    code = "AT"
    name = "Österreich"
}
