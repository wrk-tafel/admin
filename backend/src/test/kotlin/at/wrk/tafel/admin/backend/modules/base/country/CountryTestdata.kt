package at.wrk.tafel.admin.backend.modules.base.country

import at.wrk.tafel.admin.backend.database.model.staticdata.CountryEntity

val testCountry1 = CountryEntity(code = "AT", name = "Österreich").apply { id = 1 }

val testCountry2 = CountryEntity(code = "DE", name = "Deutschland").apply { id = 2 }

val testCountry3 = CountryEntity(code = "CH", name = "Schweiz").apply { id = 3 }

val testCountry4 = CountryEntity(code = "FR", name = "Frankreich").apply { id = 4 }
