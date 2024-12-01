package at.wrk.tafel.admin.backend.modules.logistics

import at.wrk.tafel.admin.backend.modules.logistics.internal.FoodCollectionService
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodCollectionsRequest
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith

@ExtendWith(MockKExtension::class)
class FoodCollectionsControllerTest {

    @RelaxedMockK
    private lateinit var foodCollectionService: FoodCollectionService

    @InjectMockKs
    private lateinit var foodCollectionsController: FoodCollectionsController

    @Test
    fun `saves food collection`() {
        val request = FoodCollectionsRequest(
            routeId = 123L,
            carLicensePlate = "W-12345",
            driverId = 1,
            coDriverId = 2,
            kmStart = 1000,
            kmEnd = 2000,
            items = emptyList()
        )

        foodCollectionsController.saveFoodCollection(request)

        verify(exactly = 1) { foodCollectionService.save(request) }
    }

}
