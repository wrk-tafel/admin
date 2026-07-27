package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.database.model.logistics.ShelterEntity
import at.wrk.tafel.admin.backend.database.model.logistics.ShelterRepository
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import at.wrk.tafel.admin.backend.modules.logistics.model.Shelter
import at.wrk.tafel.admin.backend.modules.logistics.model.ShelterContact
import at.wrk.tafel.admin.backend.modules.logistics.testShelter1
import at.wrk.tafel.admin.backend.modules.logistics.testShelter2
import at.wrk.tafel.admin.backend.modules.logistics.testShelter3
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
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
                contacts = emptyList(),
            ),
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
                contacts = emptyList(),
            ),
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
            contacts = emptyList(),
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
            contacts = emptyList(),
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
                contacts = createInput.contacts,
            ),
        )

        verify { shelterRepository.save(any()) }
    }

    @Test
    fun `create shelter with contacts`() {
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
            contacts = listOf(
                ShelterContact(firstname = "Max", lastname = "Mustermann", phone = "0123456789"),
            ),
        )

        every { shelterRepository.save(any()) } answers {
            val arg = firstArg() as ShelterEntity
            arg.id = 42
            arg
        }

        val result = service.createShelter(createInput)

        assertThat(result.contacts).containsExactly(
            ShelterContact(firstname = "Max", lastname = "Mustermann", phone = "0123456789"),
        )

        val savedEntitySlot = slot<ShelterEntity>()
        verify { shelterRepository.save(capture(savedEntitySlot)) }
        assertThat(savedEntitySlot.captured.contacts).hasSize(1)
        assertThat(savedEntitySlot.captured.contacts.first().shelter).isSameAs(savedEntitySlot.captured)
    }

    @Test
    fun `update shelter with contacts`() {
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
            contacts = listOf(
                ShelterContact(firstname = "Erika", lastname = "Musterfrau", phone = "0987654321"),
            ),
        )

        every { shelterRepository.findByIdOrNull(testShelter3.id!!) } returns testShelter3
        every { shelterRepository.save(any()) } answers { firstArg() as ShelterEntity }

        val result = service.updateShelter(testShelter3.id!!, updated)

        assertThat(result).isEqualTo(updated)

        val savedEntitySlot = slot<ShelterEntity>()
        verify { shelterRepository.save(capture(savedEntitySlot)) }
        assertThat(savedEntitySlot.captured.contacts.first().shelter).isSameAs(savedEntitySlot.captured)
    }

    @Test
    fun `update shelter throws exception when not found`() {
        every { shelterRepository.findByIdOrNull(99L) } returns null

        assertThatThrownBy { service.updateShelter(99L, testShelter3ShelterModel()) }
            .isInstanceOf(TafelValidationException::class.java)
            .hasMessage("Shelter with id 99 not found")
    }

    private fun testShelter3ShelterModel() = Shelter(
        id = testShelter3.id!!,
        name = testShelter3.name!!,
        addressStreet = testShelter3.addressStreet!!,
        addressHouseNumber = testShelter3.addressHouseNumber!!,
        addressStairway = testShelter3.addressStairway,
        addressPostalCode = testShelter3.addressPostalCode!!,
        addressCity = testShelter3.addressCity!!,
        addressDoor = testShelter3.addressDoor,
        note = testShelter3.note,
        personsCount = testShelter3.personsCount!!,
        enabled = testShelter3.enabled!!,
        contacts = emptyList(),
    )
}
