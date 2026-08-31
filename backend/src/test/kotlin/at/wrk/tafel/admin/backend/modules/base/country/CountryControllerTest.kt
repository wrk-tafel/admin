package at.wrk.tafel.admin.backend.modules.base.country

import at.wrk.tafel.admin.backend.modules.base.country.internal.CountryService
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith

@ExtendWith(MockKExtension::class)
class CountryControllerTest {

    @RelaxedMockK
    private lateinit var countryService: CountryService

    @InjectMockKs
    private lateinit var countryController: CountryController

    @Test
    fun `list countries`() {
        val country1 = CountryItem(id = 1, code = "AA", name = "Name A")
        val country2 = CountryItem(id = 2, code = "BB", name = "Name B")

        every { countryService.listCountries() } returns listOf(country1, country2)

        val response = countryController.listCountries()

        assertThat(response).isEqualTo(
            CountryListResponse(items = listOf(country1, country2), frequentlyUsedCount = 2),
        )
    }

    @Test
    fun `frequentlyUsedCount is capped at the fixed limit`() {
        val countries = (1..7).map { CountryItem(id = it.toLong(), code = "C$it", name = "Country $it") }

        every { countryService.listCountries() } returns countries

        val response = countryController.listCountries()

        assertThat(response.frequentlyUsedCount).isEqualTo(CountryService.FREQUENTLY_USED_COUNT)
    }

    @Test
    fun `list all countries for admin`() {
        val country1 = CountryResponse(id = 1, code = "AA", name = "Name A", enabled = true)
        val country2 = CountryResponse(id = 2, code = "BB", name = "Name B", enabled = false)

        every { countryService.listAllCountriesForAdmin() } returns listOf(country1, country2)

        val response = countryController.listAllCountries()

        assertThat(response).isEqualTo(CountryAdminListResponse(items = listOf(country1, country2)))
    }

    @Test
    fun `create country`() {
        val request = CountryRequest(code = "ZZ", name = "Neuland", enabled = true)
        val response = CountryResponse(id = 1, code = "ZZ", name = "Neuland", enabled = true)

        every { countryService.createCountry(request) } returns response

        val result = countryController.createCountry(request)

        assertThat(result.statusCode.value()).isEqualTo(201)
        assertThat(result.body).isEqualTo(response)
    }

    @Test
    fun `update country`() {
        val request = CountryRequest(code = "AA", name = "Neuer Name", enabled = false)
        val response = CountryResponse(id = 1, code = "AA", name = "Neuer Name", enabled = false)

        every { countryService.updateCountry(1, request) } returns response

        val result = countryController.updateCountry(1, request)

        assertThat(result).isEqualTo(response)
    }
}
