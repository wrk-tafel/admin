package at.wrk.tafel.admin.backend.modules.logistics

import at.wrk.tafel.admin.backend.modules.logistics.internal.ShelterService
import at.wrk.tafel.admin.backend.modules.logistics.model.Shelter
import at.wrk.tafel.admin.backend.modules.logistics.model.ShelterListResponse
import at.wrk.tafel.admin.backend.modules.logistics.model.ShelterReorderRequest
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.http.HttpStatus

@ExtendWith(MockKExtension::class)
class SheltersControllerTest {

    @RelaxedMockK
    private lateinit var service: ShelterService

    @InjectMockKs
    private lateinit var controller: SheltersController

    @Test
    fun `get active shelters`() {
        val shelter1 = Shelter(
            id = 1,
            name = "Shelter 1",
            addressStreet = "Street",
            addressHouseNumber = "1",
            addressStairway = "A",
            addressPostalCode = 12345,
            addressDoor = "1",
            addressCity = "City 1",
            note = "Note 1",
            personsCount = 1,
            enabled = true,
            sortOrder = 1,
            contacts = emptyList(),
        )
        val shelter2 = shelter1.copy(id = 2, name = "Shelter 2", sortOrder = 2)

        every { service.getActiveShelters() } returns listOf(shelter1, shelter2)

        val response = controller.getActiveShelters()

        assertThat(response.shelters).hasSize(2)
        assertThat(response.shelters.first()).isEqualTo(shelter1)
    }

    @Test
    fun `get all shelters`() {
        val shelter1 = Shelter(
            id = 1,
            name = "Shelter 1",
            addressStreet = "Street",
            addressHouseNumber = "1",
            addressStairway = "A",
            addressPostalCode = 12345,
            addressDoor = "1",
            addressCity = "City 1",
            note = "Note 1",
            personsCount = 1,
            enabled = true,
            sortOrder = 1,
            contacts = emptyList(),
        )
        val shelter2 = shelter1.copy(id = 2, name = "Shelter 2", sortOrder = 2)

        every { service.getAllShelters() } returns listOf(shelter1, shelter2)

        val response = controller.getAllShelters()

        assertThat(response.shelters).hasSize(2)
        assertThat(response.shelters.first()).isEqualTo(shelter1)
    }

    @Test
    fun `update shelter`() {
        val existingShelter = Shelter(
            id = 1,
            name = "Shelter 1",
            addressStreet = "Street",
            addressHouseNumber = "1",
            addressStairway = "A",
            addressPostalCode = 12345,
            addressDoor = "1",
            addressCity = "City 1",
            note = "Note 1",
            personsCount = 1,
            enabled = true,
            sortOrder = 1,
            contacts = emptyList(),
        )
        val updatedShelter = Shelter(
            id = 1,
            name = "Shelter 2",
            addressStreet = "Street X",
            addressHouseNumber = "2",
            addressStairway = "B",
            addressPostalCode = 2222,
            addressDoor = "2",
            addressCity = "City 2",
            note = "Note 2",
            personsCount = 2,
            enabled = false,
            sortOrder = 1,
            contacts = emptyList(),
        )
        every { service.updateShelter(any(), any()) } returns updatedShelter

        val response = controller.updateShelter(existingShelter.id!!, updatedShelter)

        assertThat(response).isEqualTo(updatedShelter)
        verify {
            service.updateShelter(existingShelter.id, updatedShelter)
        }
    }

    @Test
    fun `create shelter`() {
        val newShelter = Shelter(
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
            contacts = emptyList(),
        )

        val createdShelter = newShelter.copy(id = 42L, sortOrder = 1)

        every { service.createShelter(any()) } returns createdShelter

        val response = controller.createShelter(newShelter)

        assertThat(response.statusCode).isEqualTo(HttpStatus.CREATED)
        assertThat(response.body).isEqualTo(createdShelter)
        verify {
            service.createShelter(newShelter)
        }
    }

    @Test
    fun `reorder shelters`() {
        val shelter1 = Shelter(
            id = 1,
            name = "Shelter 1",
            addressStreet = "Street",
            addressHouseNumber = "1",
            addressStairway = "A",
            addressPostalCode = 12345,
            addressDoor = "1",
            addressCity = "City 1",
            note = "Note 1",
            personsCount = 1,
            enabled = true,
            sortOrder = 2,
            contacts = emptyList(),
        )
        val shelter2 = shelter1.copy(id = 2, name = "Shelter 2", sortOrder = 1)
        val request = ShelterReorderRequest(shelterIds = listOf(2L, 1L))

        every { service.reorderShelters(request.shelterIds) } returns Unit
        every { service.getAllShelters() } returns listOf(shelter2, shelter1)

        val response = controller.reorderShelters(request)

        assertThat(response).isEqualTo(
            ShelterListResponse(shelters = listOf(shelter2, shelter1)),
        )
        verify { service.reorderShelters(request.shelterIds) }
    }
}
