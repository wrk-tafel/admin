package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.database.model.logistics.ShelterEntity
import at.wrk.tafel.admin.backend.database.model.logistics.ShelterRepository
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.logistics.model.ShelterContactItem
import at.wrk.tafel.admin.backend.modules.logistics.model.ShelterRequest
import at.wrk.tafel.admin.backend.modules.logistics.model.ShelterResponse
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
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
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
            ShelterResponse(
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
                sortOrder = testShelter1.sortOrder!!,
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
            ShelterResponse(
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
                sortOrder = testShelter1.sortOrder!!,
                contacts = emptyList(),
            ),
        )
    }

    @Test
    fun `update shelter`() {
        val updated = ShelterRequest(
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
            sortOrder = 5,
            contacts = emptyList(),
        )

        every { shelterRepository.findByIdOrNull(testShelter3.id!!) } returns testShelter3
        every { shelterRepository.save(any()) } answers { firstArg() as ShelterEntity }

        val result = service.updateShelter(testShelter3.id!!, updated)

        assertThat(result).isEqualTo(
            ShelterResponse(
                id = updated.id,
                name = updated.name,
                addressStreet = updated.addressStreet,
                addressHouseNumber = updated.addressHouseNumber,
                addressStairway = updated.addressStairway,
                addressPostalCode = updated.addressPostalCode,
                addressCity = updated.addressCity,
                addressDoor = updated.addressDoor,
                note = updated.note,
                personsCount = updated.personsCount,
                enabled = updated.enabled,
                sortOrder = updated.sortOrder,
                contacts = updated.contacts,
            ),
        )
    }

    @Test
    fun `create shelter assigns next sort order after the current max, ignoring the input value`() {
        val createInput = ShelterRequest(
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
            sortOrder = 999,
            contacts = emptyList(),
        )

        every { shelterRepository.findAll() } returns listOf(testShelter1, testShelter2, testShelter3)
        every { shelterRepository.save(any()) } answers {
            val arg = firstArg() as ShelterEntity
            arg.id = 42
            arg
        }

        val result = service.createShelter(createInput)

        assertThat(result).isEqualTo(
            ShelterResponse(
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
                sortOrder = 4,
                contacts = createInput.contacts,
            ),
        )

        verify { shelterRepository.save(any()) }
    }

    @Test
    fun `create shelter assigns sort order 1 when no shelters exist yet`() {
        val createInput = ShelterRequest(
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
            sortOrder = 999,
            contacts = emptyList(),
        )

        every { shelterRepository.findAll() } returns emptyList()
        every { shelterRepository.save(any()) } answers {
            val arg = firstArg() as ShelterEntity
            arg.id = 42
            arg
        }

        val result = service.createShelter(createInput)

        assertThat(result.sortOrder).isEqualTo(1)
    }

    @Test
    fun `create shelter with contacts`() {
        val createInput = ShelterRequest(
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
            sortOrder = 0,
            contacts = listOf(
                ShelterContactItem(firstname = "Max", lastname = "Mustermann", phone = "0123456789"),
            ),
        )

        every { shelterRepository.save(any()) } answers {
            val arg = firstArg() as ShelterEntity
            arg.id = 42
            arg
        }

        val result = service.createShelter(createInput)

        assertThat(result.contacts).containsExactly(
            ShelterContactItem(firstname = "Max", lastname = "Mustermann", phone = "0123456789"),
        )

        val savedEntitySlot = slot<ShelterEntity>()
        verify { shelterRepository.save(capture(savedEntitySlot)) }
        assertThat(savedEntitySlot.captured.contacts).hasSize(1)
        assertThat(savedEntitySlot.captured.contacts.first().shelter).isSameAs(savedEntitySlot.captured)
    }

    @Test
    fun `update shelter with contacts`() {
        val updated = ShelterRequest(
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
            sortOrder = 5,
            contacts = listOf(
                ShelterContactItem(firstname = "Erika", lastname = "Musterfrau", phone = "0987654321"),
            ),
        )

        every { shelterRepository.findByIdOrNull(testShelter3.id!!) } returns testShelter3
        every { shelterRepository.save(any()) } answers { firstArg() as ShelterEntity }

        val result = service.updateShelter(testShelter3.id!!, updated)

        assertThat(result).isEqualTo(
            ShelterResponse(
                id = updated.id,
                name = updated.name,
                addressStreet = updated.addressStreet,
                addressHouseNumber = updated.addressHouseNumber,
                addressStairway = updated.addressStairway,
                addressPostalCode = updated.addressPostalCode,
                addressCity = updated.addressCity,
                addressDoor = updated.addressDoor,
                note = updated.note,
                personsCount = updated.personsCount,
                enabled = updated.enabled,
                sortOrder = updated.sortOrder,
                contacts = updated.contacts,
            ),
        )

        val savedEntitySlot = slot<ShelterEntity>()
        verify { shelterRepository.save(capture(savedEntitySlot)) }
        assertThat(savedEntitySlot.captured.contacts.first().shelter).isSameAs(savedEntitySlot.captured)
    }

    @Test
    fun `update shelter throws exception when not found`() {
        every { shelterRepository.findByIdOrNull(99L) } returns null

        val exception = assertThrows<NotFoundException> { service.updateShelter(99L, testShelter3ShelterRequest()) }
        assertThat(exception.body.detail).isEqualTo("Shelter with id 99 not found")
    }

    @Test
    fun `reorder shelters assigns sequential sort order matching the given order`() {
        val entity1 = ShelterEntity().apply {
            id = 1
            sortOrder = 200
        }
        val entity2 = ShelterEntity().apply {
            id = 2
            sortOrder = 100
        }
        val entity3 = ShelterEntity().apply {
            id = 3
            sortOrder = 300
        }

        every { shelterRepository.findByIdOrNull(3L) } returns entity3
        every { shelterRepository.findByIdOrNull(1L) } returns entity1
        every { shelterRepository.findByIdOrNull(2L) } returns entity2
        every { shelterRepository.save(any()) } answers { firstArg() as ShelterEntity }

        service.reorderShelters(listOf(3L, 1L, 2L))

        assertThat(entity3.sortOrder).isEqualTo(1)
        assertThat(entity1.sortOrder).isEqualTo(2)
        assertThat(entity2.sortOrder).isEqualTo(3)
        verify(exactly = 3) { shelterRepository.save(any()) }
    }

    @Test
    fun `reorder shelters throws exception when a shelter is not found`() {
        every { shelterRepository.findByIdOrNull(99L) } returns null

        val exception = assertThrows<NotFoundException> { service.reorderShelters(listOf(99L)) }
        assertThat(exception.body.detail).isEqualTo("Shelter with id 99 not found")
    }

    private fun testShelter3ShelterRequest() = ShelterRequest(
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
        sortOrder = testShelter3.sortOrder!!,
        contacts = emptyList(),
    )
}
