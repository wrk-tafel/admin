package at.wrk.tafel.admin.backend.common.testdata

import at.wrk.tafel.admin.backend.database.entities.staticdata.CountryEntity

val testCountry = CountryEntity().apply {
    id = 1
    code = "AT"
    name = "Österreich"
}
