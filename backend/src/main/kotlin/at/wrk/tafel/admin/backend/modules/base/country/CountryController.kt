package at.wrk.tafel.admin.backend.modules.base.country

import at.wrk.tafel.admin.backend.database.model.staticdata.CountryRepository
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
