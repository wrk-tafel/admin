package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.database.model.logistics.ShelterRepository
import at.wrk.tafel.admin.backend.modules.logistics.model.Shelter
import at.wrk.tafel.admin.backend.modules.logistics.testShelter1
import at.wrk.tafel.admin.backend.modules.logistics.testShelter2
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith

@ExtendWith(MockKExtension::class)
class ShelterServiceTest {

    @RelaxedMockK
    private lateinit var shelterRepository: ShelterRepository

    @InjectMockKs
    private lateinit var service: ShelterService

    @Test
    fun `get all shelters`() {
        every { shelterRepository.findAll() } returns listOf(testShelter1, testShelter2)

        val shelters = service.getShelters()

        assertThat(shelters).hasSize(2)
        assertThat(shelters.first()).isEqualTo(
            Shelter(
                id = testShelter1.id!!,
                name = testShelter1.name!!,
                addressStreet = testShelter1.addressStreet!!,
                addressHouseNumber = testShelter1.addressHouseNumber!!,
                addressStairway = testShelter1.addressStairway,
                addressPostalCode = testShelter1.addressPostalCode!!,
                addressCity = testShelter1.addressCity!!,
                addressDoor = testShelter1.addressDoor,
                note = testShelter1.note,
                personsCount = testShelter1.personsCount!!
            )
        )
    }

}
