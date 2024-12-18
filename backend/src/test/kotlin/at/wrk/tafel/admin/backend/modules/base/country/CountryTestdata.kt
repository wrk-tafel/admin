package at.wrk.tafel.admin.backend.modules.base.country

import at.wrk.tafel.admin.backend.database.model.staticdata.CountryEntity

val testCountry1 = CountryEntity().apply {
    id = 1
    code = "AT"
    name = "Österreich"
}

val testCountry2 = CountryEntity().apply {
    id = 2
    code = "DE"
    name = "Deutschland"
}

val testCountry3 = CountryEntity().apply {
    id = 3
    code = "CH"
    name = "Schweiz"
}

val testCountry4 = CountryEntity().apply {
    id = 4
    code = "FR"
    name = "Frankreich"
}
