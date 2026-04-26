package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.database.model.logistics.ShelterEntity
import at.wrk.tafel.admin.backend.database.model.logistics.ShelterRepository
import at.wrk.tafel.admin.backend.modules.logistics.model.Shelter
import at.wrk.tafel.admin.backend.modules.logistics.testShelter1
import at.wrk.tafel.admin.backend.modules.logistics.testShelter2
import at.wrk.tafel.admin.backend.modules.logistics.testShelter3
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.data.repository.findByIdOrNull

@ExtendWith(MockKExtension::class)
class ShelterServiceTest {

    @RelaxedMockK
    private lateinit var shelterRepository: ShelterRepository

    @InjectMockKs
    private lateinit var service: ShelterService

    @Test
    fun `get active shelters`() {
        every { shelterRepository.findByEnabledIsTrue() } returns listOf(testShelter1, testShelter2)

        val shelters = service.getActiveShelters()

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
                personsCount = testShelter1.personsCount!!,
                enabled = testShelter1.enabled!!,
                contacts = emptyList()
            )
        )
    }

    @Test
    fun `get all shelters`() {
        every { shelterRepository.findAll() } returns listOf(testShelter1, testShelter2)

        val shelters = service.getAllShelters()

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
                personsCount = testShelter1.personsCount!!,
                enabled = testShelter1.enabled!!,
                contacts = emptyList()
            )
        )
    }

    @Test
    fun `update shelter`() {
        val updated = Shelter(
            id = testShelter3.id!!,
            name = "Updated Shelter",
            addressStreet = testShelter3.addressStreet!!,
            addressHouseNumber = testShelter3.addressHouseNumber!!,
            addressStairway = testShelter3.addressStairway,
            addressPostalCode = testShelter3.addressPostalCode!!,
            addressCity = testShelter3.addressCity!!,
            addressDoor = testShelter3.addressDoor,
            note = "Updated note",
            personsCount = 5,
            enabled = false,
            contacts = emptyList()
        )

        every { shelterRepository.findByIdOrNull(testShelter3.id!!) } returns testShelter3
        every { shelterRepository.save(any()) } answers { firstArg() as ShelterEntity }

        val result = service.updateShelter(testShelter3.id!!, updated)

        assertThat(result).isEqualTo(updated)
    }

    @Test
    fun `create shelter`() {
        val createInput = Shelter(
            id = 0L,
            name = "New Shelter",
            addressStreet = "New Street",
            addressHouseNumber = "10",
            addressStairway = null,
            addressPostalCode = 11111,
            addressDoor = null,
            addressCity = "New City",
            note = "New note",
            personsCount = 5,
            enabled = true,
            contacts = emptyList()
        )

        every { shelterRepository.save(any()) } answers {
            val arg = firstArg() as ShelterEntity
            arg.id = 42
            arg
        }

        val result = service.createShelter(createInput)

        assertThat(result).isEqualTo(
            Shelter(
                id = 42L,
                name = createInput.name,
                addressStreet = createInput.addressStreet,
                addressHouseNumber = createInput.addressHouseNumber,
                addressStairway = createInput.addressStairway,
                addressPostalCode = createInput.addressPostalCode,
                addressCity = createInput.addressCity,
                addressDoor = createInput.addressDoor,
                note = createInput.note,
                personsCount = createInput.personsCount,
                enabled = createInput.enabled,
                contacts = createInput.contacts
            )
        )

        verify { shelterRepository.save(any()) }
    }

}
