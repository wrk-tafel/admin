package at.wrk.tafel.admin.backend.modules.base

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.repositories.staticdata.CountryRepository
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/countries")
class CountryController(
    private val countryRepository: CountryRepository
) {

    @GetMapping
    fun listCountries(): CountryListResponse {
        return CountryListResponse(
            items = countryRepository.findAll().map {
                Country(
                    id = it.id!!,
                    code = it.code!!,
                    name = it.name!!
                )
            }
        )
    }
}

@ExcludeFromTestCoverage
data class CountryListResponse(
    val items: List<Country> = emptyList()
)

@ExcludeFromTestCoverage
data class Country(
    val id: Long,
    val code: String,
    val name: String
)
