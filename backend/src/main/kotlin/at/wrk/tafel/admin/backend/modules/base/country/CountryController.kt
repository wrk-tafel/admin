package at.wrk.tafel.admin.backend.modules.base.country

import at.wrk.tafel.admin.backend.modules.base.country.internal.CountryService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
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

    @GetMapping("/admin")
    @PreAuthorize("hasAuthority('SETTINGS')")
    fun listAllCountries(): CountryAdminListResponse = CountryAdminListResponse(items = countryService.listAllCountriesForAdmin())

    @PostMapping
    @PreAuthorize("hasAuthority('SETTINGS')")
    fun createCountry(
        @Valid @RequestBody request: CountryRequest,
    ): ResponseEntity<CountryResponse> = ResponseEntity.status(HttpStatus.CREATED).body(countryService.createCountry(request))

    @PutMapping("/{countryId}")
    @PreAuthorize("hasAuthority('SETTINGS')")
    fun updateCountry(
        @PathVariable countryId: Long,
        @Valid @RequestBody request: CountryRequest,
    ): CountryResponse = countryService.updateCountry(countryId, request)
}
