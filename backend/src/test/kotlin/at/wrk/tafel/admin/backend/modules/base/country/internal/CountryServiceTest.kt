package at.wrk.tafel.admin.backend.modules.base.country.internal

import at.wrk.tafel.admin.backend.database.model.person.CountryUsageCount
import at.wrk.tafel.admin.backend.database.model.person.PersonRepository
import at.wrk.tafel.admin.backend.database.model.staticdata.CountryEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.CountryRepository
import at.wrk.tafel.admin.backend.modules.base.country.CountryItem
import at.wrk.tafel.admin.backend.modules.base.country.CountryRequest
import at.wrk.tafel.admin.backend.modules.base.country.CountryResponse
import at.wrk.tafel.admin.backend.modules.base.country.testCountry1
import at.wrk.tafel.admin.backend.modules.base.country.testCountry2
import at.wrk.tafel.admin.backend.modules.base.country.testCountry3
import at.wrk.tafel.admin.backend.modules.base.country.testCountry4
import at.wrk.tafel.admin.backend.modules.base.country.testCountry5
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.data.repository.findByIdOrNull

@ExtendWith(MockKExtension::class)
class CountryServiceTest {

    @RelaxedMockK
    private lateinit var countryRepository: CountryRepository

    @RelaxedMockK
    private lateinit var personRepository: PersonRepository

    @InjectMockKs
    private lateinit var countryService: CountryService

    @Test
    fun `list countries without any usage stay alphabetical`() {
        every { countryRepository.findByEnabledIsTrue() } returns listOf(testCountry2, testCountry1)
        every { personRepository.countPersonsByCountry() } returns emptyList()

        val countries = countryService.listCountries()

        assertThat(countries).isEqualTo(
            listOf(
                CountryItem(id = testCountry2.id!!, code = testCountry2.code!!, name = testCountry2.name!!),
                CountryItem(id = testCountry1.id!!, code = testCountry1.code!!, name = testCountry1.name!!),
            ),
        )
    }

    @Test
    fun `countries with more usage come first, ties broken alphabetically`() {
        every { countryRepository.findByEnabledIsTrue() } returns listOf(testCountry1, testCountry2, testCountry3, testCountry4)
        every { personRepository.countPersonsByCountry() } returns listOf(
            testUsageCount(testCountry1.id!!, 2),
            testUsageCount(testCountry2.id!!, 5),
        )

        val countries = countryService.listCountries()

        // testCountry2 (usage 5) first, then testCountry1 (usage 2), then the unused
        // testCountry3/testCountry4 alphabetically ("Frankreich" before "Schweiz")
        assertThat(countries.map { it.id }).isEqualTo(
            listOf(testCountry2.id, testCountry1.id, testCountry4.id, testCountry3.id),
        )
    }

    @Test
    fun `disabled countries are excluded from the selectable list`() {
        every { countryRepository.findByEnabledIsTrue() } returns listOf(testCountry1)
        every { personRepository.countPersonsByCountry() } returns emptyList()

        val countries = countryService.listCountries()

        assertThat(countries.map { it.id }).containsExactly(testCountry1.id)
    }

    @Test
    fun `admin listing includes disabled countries, sorted alphabetically`() {
        every { countryRepository.findAll() } returns listOf(testCountry1, testCountry5)

        val countries = countryService.listAllCountriesForAdmin()

        assertThat(countries).isEqualTo(
            listOf(
                CountryResponse(id = testCountry5.id!!, code = testCountry5.code, name = testCountry5.name, enabled = false),
                CountryResponse(id = testCountry1.id!!, code = testCountry1.code, name = testCountry1.name, enabled = true),
            ),
        )
    }

    @Test
    fun `update country changes name and enabled state`() {
        val existingEntity = CountryEntity(code = "AT", name = "Österreich").apply { id = 1 }

        every { countryRepository.findByIdOrNull(existingEntity.id!!) } returns existingEntity
        every { countryRepository.save(any()) } answers { firstArg() as CountryEntity }

        val response = countryService.updateCountry(existingEntity.id!!, CountryRequest(name = "Neuer Name", enabled = false))

        assertThat(response).isEqualTo(
            CountryResponse(id = existingEntity.id!!, code = existingEntity.code, name = "Neuer Name", enabled = false),
        )
    }

    @Test
    fun `update country throws NotFoundException for unknown id`() {
        every { countryRepository.findByIdOrNull(999) } returns null

        val exception = assertThrows<NotFoundException> { countryService.updateCountry(999, CountryRequest(name = "X", enabled = true)) }
        assertThat(exception.body.detail).isEqualTo("Country with id 999 not found")
    }

    private fun testUsageCount(countryId: Long, usageCount: Long): CountryUsageCount = object : CountryUsageCount {
        override val countryId = countryId
        override val usageCount = usageCount
    }
}
