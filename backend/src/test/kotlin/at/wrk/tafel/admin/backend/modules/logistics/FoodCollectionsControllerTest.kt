package at.wrk.tafel.admin.backend.modules.logistics

import at.wrk.tafel.admin.backend.modules.base.employee.Employee
import at.wrk.tafel.admin.backend.modules.logistics.internal.FoodCollectionService
import at.wrk.tafel.admin.backend.modules.logistics.model.*
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
class FoodCollectionsControllerTest {

    @RelaxedMockK
    private lateinit var service: FoodCollectionService

    @InjectMockKs
    private lateinit var controller: FoodCollectionsController

    @Test
    fun `get food collection`() {
        val routeId = 456L
        val testFoodCollectionData = FoodCollectionData(
            routeId = routeId,
            carId = 1,
            driver = Employee(
                id = 1,
                personnelNumber = "111",
                firstname = "employee firstname 1",
                lastname = "employee lastname 1"
            ),
            coDriver = Employee(
                id = 2,
                personnelNumber = "222",
                firstname = "employee firstname 2",
                lastname = "employee lastname 2"
            ),
            kmStart = 1000,
            kmEnd = 2000,
            items = listOf(
                FoodCollectionItem(
                    categoryId = 1,
                    shopId = 2,
                    amount = 3
                )
            )
        )

        every { service.getFoodCollection(routeId) } returns testFoodCollectionData

        val response = controller.getFoodCollection(routeId)

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.body).isEqualTo(testFoodCollectionData)
    }

    @Test
    fun `get food collection without existing data`() {
        val routeId = 456L
        every { service.getFoodCollection(routeId) } returns null

        val response = controller.getFoodCollection(routeId)

        assertThat(response.statusCode).isEqualTo(HttpStatus.NO_CONTENT)
        assertThat(response.body).isEqualTo(null)
    }

    @Test
    fun `saves route data`() {
        val routeId = 123L
        val request = FoodCollectionSaveRouteData(
            carId = 1,
            driverId = 1,
            coDriverId = 2,
            kmStart = 1000,
            kmEnd = 2000
        )

        controller.saveFoodCollectionRouteData(routeId = routeId, request = request)

        verify(exactly = 1) { service.saveRouteData(routeId = routeId, data = request) }
    }

    @Test
    fun `save items`() {
        val routeId = 123L
        val request = FoodCollectionItems(
            items = listOf(
                FoodCollectionItem(
                    categoryId = 1,
                    shopId = 2,
                    amount = 3
                )
            )
        )

        controller.saveFoodCollectionItems(routeId = routeId, request = request)

        verify(exactly = 1) { service.saveItems(routeId = routeId, data = request) }
    }

    @Test
    fun `save items per shop`() {
        val routeId = 123L
        val shopId = 456L
        val request = FoodCollectionSaveItemsPerShopData(
            items = listOf(
                FoodCollectionCategoryAmount(
                    categoryId = 1,
                    amount = 3
                )
            )
        )

        controller.saveFoodCollectionItemsPerShop(routeId = routeId, shopId = shopId, request = request)

        verify(exactly = 1) { service.saveItemsPerShop(routeId = routeId, shopId = shopId, data = request) }
    }

    @Test
    fun `get items per shop`() {
        val routeId = 123L
        val shopId = 456L
        val responseBody = FoodCollectionItems(
            items = listOf(
                FoodCollectionItem(
                    categoryId = 1,
                    shopId = 2,
                    amount = 3
                )
            )
        )
        every { service.getItemsPerShop(any(), any()) } returns responseBody

        val response = controller.getFoodCollectionItemsPerShop(routeId = routeId, shopId = shopId)

        verify(exactly = 1) { service.getItemsPerShop(routeId = routeId, shopId = shopId) }

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.body).isEqualTo(responseBody)
    }

    @Test
    fun `get items per shop without existing data`() {
        val routeId = 123L
        val shopId = 456L
        every { service.getItemsPerShop(any(), any()) } returns null

        val response = controller.getFoodCollectionItemsPerShop(routeId = routeId, shopId = shopId)

        verify(exactly = 1) { service.getItemsPerShop(routeId = routeId, shopId = shopId) }

        assertThat(response.statusCode).isEqualTo(HttpStatus.NO_CONTENT)
    }

    @Test
    fun `patch a single item`() {
        val routeId = 123L
        val request = FoodCollectionItem(
            categoryId = 1,
            shopId = 2,
            amount = 3
        )

        controller.patchFoodCollectionItem(routeId = routeId, request = request)

        verify(exactly = 1) { service.patchItem(routeId = routeId, data = request) }
    }

}
