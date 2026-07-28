package at.wrk.tafel.admin.backend.modules.base.country.internal

import at.wrk.tafel.admin.backend.database.model.staticdata.CountryRepository
import at.wrk.tafel.admin.backend.modules.base.country.Country
import org.springframework.stereotype.Service

@Service
class CountryService(
    private val countryRepository: CountryRepository,
) {

    // static_countries.code/name are NOT NULL in the DB, but CountryEntity models both as String? for the
    // JPA no-arg constructor, so the assertions below are genuinely required (removing either is a compile
    // error). Sonar (kotlin:S6619) flags the `code` assertion as dead regardless of which null-check syntax
    // is used - confirmed false positive, suppressed rather than reworded.
    fun listCountries(): List<Country> = countryRepository.findAll().map {
        Country(
            id = it.id!!,
            code = it.code!!, // NOSONAR kotlin:S6619
            name = it.name!!,
        )
    }
}
