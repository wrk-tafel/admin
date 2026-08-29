package at.wrk.tafel.admin.backend.modules.base.country

import at.wrk.tafel.admin.backend.modules.base.country.internal.CountryService
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/countries")
@PreAuthorize("isAuthenticated()")
class CountryController(
    private val countryService: CountryService,
) {

    @GetMapping
    fun listCountries(): CountryListResponse {
        val countries = countryService.listCountries()
        return CountryListResponse(
            items = countries,
            frequentlyUsedCount = minOf(CountryService.FREQUENTLY_USED_COUNT, countries.size),
        )
    }
}
