package at.wrk.tafel.admin.backend.modules.base.country

import at.wrk.tafel.admin.backend.database.model.staticdata.CountryEntity

val testCountry1 = CountryEntity(name = "Österreich").apply { id = 1 }

val testCountry2 = CountryEntity(name = "Deutschland").apply { id = 2 }

val testCountry3 = CountryEntity(name = "Schweiz").apply { id = 3 }

val testCountry4 = CountryEntity(name = "Frankreich").apply { id = 4 }

val testCountry5 = CountryEntity(name = "Deaktiviert", enabled = false).apply { id = 5 }
