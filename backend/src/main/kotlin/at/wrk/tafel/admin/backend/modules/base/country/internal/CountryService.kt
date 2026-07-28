package at.wrk.tafel.admin.backend.modules.base.country.internal

import at.wrk.tafel.admin.backend.database.model.staticdata.CountryRepository
import at.wrk.tafel.admin.backend.modules.base.country.Country
import org.springframework.stereotype.Service

@Service
class CountryService(
    private val countryRepository: CountryRepository,
) {

    fun listCountries(): List<Country> = countryRepository.findAll().map {
        Country(
            id = it.id!!,
            code = it.code!!,
            name = it.name!!,
        )
    }
}
