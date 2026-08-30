package at.wrk.tafel.admin.backend.modules.base.country.internal

import at.wrk.tafel.admin.backend.common.sanitizeForLog
import at.wrk.tafel.admin.backend.database.model.person.PersonRepository
import at.wrk.tafel.admin.backend.database.model.staticdata.CountryEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.CountryRepository
import at.wrk.tafel.admin.backend.modules.base.country.CountryItem
import at.wrk.tafel.admin.backend.modules.base.country.CountryRequest
import at.wrk.tafel.admin.backend.modules.base.country.CountryResponse
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import org.slf4j.LoggerFactory
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service

@Service
class CountryService(
    private val countryRepository: CountryRepository,
    private val personRepository: PersonRepository,
) {

    companion object {
        const val FREQUENTLY_USED_COUNT = 5
        private val log = LoggerFactory.getLogger(CountryService::class.java)
    }

    /**
     * Ordered so the [FREQUENTLY_USED_COUNT] countries with the most persons ever assigned to them
     * (across every household, regardless of validity) come first - ties broken alphabetically -
     * with the remaining countries alphabetical after them. `CountryController` reports where that
     * split sits via `CountryListResponse.frequentlyUsedCount`, so the frontend's nationality
     * autocomplete knows where to render its divider. A country disabled in the admin screen is
     * excluded here, so it stops being offered for a new/edited person while an already-assigned
     * person keeps pointing at it.
     */
    fun listCountries(): List<CountryItem> {
        val usageByCountryId = personRepository.countPersonsByCountry()
            .associate { it.countryId to it.usageCount }

        return countryRepository.findByEnabledIsTrue()
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

    fun listAllCountriesForAdmin(): List<CountryResponse> = countryRepository.findAll()
        .sortedBy { it.name }
        .map { mapToResponse(it) }

    fun updateCountry(countryId: Long, request: CountryRequest): CountryResponse {
        val entity = countryRepository.findByIdOrNull(countryId)
            ?: throw NotFoundException("Country with id $countryId not found")

        entity.name = request.name
        entity.enabled = request.enabled

        val savedEntity = countryRepository.save(entity)
        log.info("Updated country {} ({})", savedEntity.id, sanitizeForLog(savedEntity.name))
        return mapToResponse(savedEntity)
    }

    private fun mapToResponse(entity: CountryEntity) = CountryResponse(
        id = entity.id!!,
        code = entity.code,
        name = entity.name,
        enabled = entity.enabled,
    )
}
