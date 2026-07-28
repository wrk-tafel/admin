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
        val country1 = Country(id = 1, code = "AA", name = "Name A")
        val country2 = Country(id = 2, code = "BB", name = "Name B")

        every { countryService.listCountries() } returns listOf(country1, country2)

        val response = countryController.listCountries()

        assertThat(response).isEqualTo(
            CountryListResponse(items = listOf(country1, country2)),
        )
    }
}
