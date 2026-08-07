package at.wrk.tafel.admin.backend.modules.base.country.internal

import at.wrk.tafel.admin.backend.database.model.staticdata.CountryRepository
import at.wrk.tafel.admin.backend.modules.base.country.CountryItem
import org.springframework.stereotype.Service

@Service
class CountryService(
    private val countryRepository: CountryRepository,
) {

    fun listCountries(): List<CountryItem> = countryRepository.findAll().map {
        CountryItem(
            id = it.id!!,
            code = it.code,
            name = it.name,
        )
    }
}
