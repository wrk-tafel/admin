package at.wrk.tafel.admin.backend.modules.logistics

import at.wrk.tafel.admin.backend.modules.logistics.internal.FoodCollectionService
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodCollectionData
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodCollectionItem
import at.wrk.tafel.admin.backend.modules.logistics.model.FoodCollectionSaveRequest
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith

@ExtendWith(MockKExtension::class)
class FoodCollectionsControllerTest {

    @RelaxedMockK
    private lateinit var service: FoodCollectionService

    @InjectMockKs
    private lateinit var controller: FoodCollectionsController

    @Test
    fun `get food collection`() {
        val routeId = 456L
        val foodCollectionItem = FoodCollectionItem(
            categoryId = 1,
            shopId = 2,
            amount = 3
        )

        every { service.getFoodCollectionItems(routeId) } returns listOf(foodCollectionItem)

        val foodCollectionData = controller.getFoodCollection(routeId)

        assertThat(foodCollectionData).isEqualTo(
            FoodCollectionData(
                items = listOf(foodCollectionItem)
            )
        )
    }

    @Test
    fun `saves food collection`() {
        val request = FoodCollectionSaveRequest(
            routeId = 123L,
            carId = 1,
            driverId = 1,
            coDriverId = 2,
            kmStart = 1000,
            kmEnd = 2000,
            items = emptyList()
        )

        controller.saveFoodCollection(request)

        verify(exactly = 1) { service.save(request) }
    }

}
