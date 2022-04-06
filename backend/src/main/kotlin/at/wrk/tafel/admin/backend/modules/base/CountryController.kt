package at.wrk.tafel.admin.backend.modules.base

import at.wrk.tafel.admin.backend.database.repositories.staticdata.CountryRepository
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
                    code = it.code!!,
                    name = it.name!!
                )
            }
        )
    }
}

data class CountryListResponse(
    val items: List<Country> = emptyList()
)

data class Country(
    val code: String,
    val name: String
)
