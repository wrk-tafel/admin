package at.wrk.tafel.admin.backend.modules.base

import at.wrk.tafel.admin.backend.database.entities.staticdata.CountryEntity
import at.wrk.tafel.admin.backend.database.repositories.staticdata.CountryRepository
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
    private lateinit var countryRepository: CountryRepository

    @InjectMockKs
    private lateinit var countryController: CountryController

    @Test
    fun `list countries`() {
        val country1 = CountryEntity()
        country1.code = "AA"
        country1.name = "Name A"

        val country2 = CountryEntity()
        country2.code = "BB"
        country2.name = "Name B"

        every { countryRepository.findAll() } returns listOf(country1, country2)

        val response = countryController.listCountries()

        assertThat(response).isNotNull
        assertThat(response.items).hasSize(2)

        assertThat(response.items).hasSameElementsAs(
            listOf(
                Country(code = "AA", name = "Name A"),
                Country(code = "BB", name = "Name B")
            )
        )
    }
}
