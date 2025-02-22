package at.wrk.tafel.admin.backend.modules.logistics

import at.wrk.tafel.admin.backend.modules.logistics.internal.ShelterService
import at.wrk.tafel.admin.backend.modules.logistics.model.Shelter
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith

@ExtendWith(MockKExtension::class)
class SheltersControllerTest {

    @RelaxedMockK
    private lateinit var shelterService: ShelterService

    @InjectMockKs
    private lateinit var controller: SheltersController

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
            personsCount = 1
        )
        val shelter2 = shelter1.copy(id = 2, name = "Shelter 2")

        every { shelterService.getShelters() } returns listOf(shelter1, shelter2)

        val response = controller.getShelters()

        assertThat(response.shelters).hasSize(2)
        assertThat(response.shelters.first()).isEqualTo(shelter1)
    }

}
