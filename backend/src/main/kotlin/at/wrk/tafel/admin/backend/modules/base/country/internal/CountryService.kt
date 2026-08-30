package at.wrk.tafel.admin.backend.modules.base.country.internal

import at.wrk.tafel.admin.backend.database.model.person.PersonRepository
import at.wrk.tafel.admin.backend.database.model.staticdata.CountryEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.CountryRepository
import at.wrk.tafel.admin.backend.modules.base.country.CountryItem
import org.springframework.stereotype.Service

@Service
class CountryService(
    private val countryRepository: CountryRepository,
    private val personRepository: PersonRepository,
) {

    /**
     * Ordered so the [FREQUENTLY_USED_COUNT] countries with the most persons ever assigned to them
     * (across every household, regardless of validity) come first - ties broken alphabetically -
     * with the remaining countries alphabetical after them. `CountryController` reports where that
     * split sits via `CountryListResponse.frequentlyUsedCount`, so the frontend's nationality
     * autocomplete knows where to render its divider.
     */
    fun listCountries(): List<CountryItem> {
        val usageByCountryId = personRepository.countPersonsByCountry()
            .associate { it.countryId to it.usageCount }

        return countryRepository.findAll()
            .sortedWith(
                compareByDescending<CountryEntity> { usageByCountryId[it.id] ?: 0L }
                    .thenBy { it.name },
            )
            .map {
                CountryItem(
                    id = it.id!!,
                    code = it.code,
                    name = it.name,
                )
            }
    }

    companion object {
        const val FREQUENTLY_USED_COUNT = 5
    }
}
