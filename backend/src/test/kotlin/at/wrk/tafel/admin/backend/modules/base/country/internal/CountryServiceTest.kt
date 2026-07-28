package at.wrk.tafel.admin.backend.modules.base.country.internal

import at.wrk.tafel.admin.backend.database.model.staticdata.CountryRepository
import at.wrk.tafel.admin.backend.modules.base.country.Country
import at.wrk.tafel.admin.backend.modules.base.country.testCountry1
import at.wrk.tafel.admin.backend.modules.base.country.testCountry2
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith

@ExtendWith(MockKExtension::class)
class CountryServiceTest {

    @RelaxedMockK
    private lateinit var countryRepository: CountryRepository

    @InjectMockKs
    private lateinit var countryService: CountryService

    @Test
    fun `list countries`() {
        every { countryRepository.findAll() } returns listOf(testCountry1, testCountry2)

        val countries = countryService.listCountries()

        assertThat(countries).isEqualTo(
            listOf(
                Country(id = testCountry1.id!!, code = testCountry1.code!!, name = testCountry1.name!!),
                Country(id = testCountry2.id!!, code = testCountry2.code!!, name = testCountry2.name!!),
            ),
        )
    }
}
