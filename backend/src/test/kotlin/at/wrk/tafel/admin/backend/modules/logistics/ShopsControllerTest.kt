package at.wrk.tafel.admin.backend.modules.logistics

import at.wrk.tafel.admin.backend.database.model.logistics.FoodUnit
import at.wrk.tafel.admin.backend.modules.logistics.internal.ShopService
import at.wrk.tafel.admin.backend.modules.logistics.model.ShopListResponse
import at.wrk.tafel.admin.backend.modules.logistics.model.ShopRequest
import at.wrk.tafel.admin.backend.modules.logistics.model.ShopResponse
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
class ShopsControllerTest {

    @RelaxedMockK
    private lateinit var shopService: ShopService

    @InjectMockKs
    private lateinit var controller: ShopsController

    private val shop1 = ShopResponse(
        id = 1,
        number = 100,
        name = "Billa",
        addressStreet = "Street 1",
        addressPostalCode = 1100,
        addressCity = "Wien",
        foodUnit = FoodUnit.BOX,
        phone = "01 234 56 78",
        contactPerson = "Fr. Musterfrau",
        note = "Note",
        enabled = true,
    )
    private val shop2 = shop1.copy(id = 2, number = 200, name = "Hofer", foodUnit = FoodUnit.KG, enabled = false)

    @Test
    fun `get all shops`() {
        every { shopService.getAllShops() } returns listOf(shop1, shop2)

        val response = controller.getAllShops()

        assertThat(response).isEqualTo(ShopListResponse(shops = listOf(shop1, shop2)))
    }

    @Test
    fun `create shop`() {
        val newShop = shopRequest()
        every { shopService.createShop(any()) } returns shop1

        val response = controller.createShop(newShop)

        assertThat(response.statusCode).isEqualTo(HttpStatus.CREATED)
        assertThat(response.body).isEqualTo(shop1)
        verify { shopService.createShop(newShop) }
    }

    @Test
    fun `update shop`() {
        val updatedShop = shopRequest().copy(id = 1, name = "Billa Plus")
        val updatedResponse = shop1.copy(name = "Billa Plus")
        every { shopService.updateShop(any(), any()) } returns updatedResponse

        val response = controller.updateShop(1L, updatedShop)

        assertThat(response).isEqualTo(updatedResponse)
        verify { shopService.updateShop(1L, updatedShop) }
    }

    private fun shopRequest() = ShopRequest(
        id = null,
        number = 100,
        name = "Billa",
        addressStreet = "Street 1",
        addressPostalCode = 1100,
        addressCity = "Wien",
        foodUnit = FoodUnit.BOX,
        phone = "01 234 56 78",
        contactPerson = "Fr. Musterfrau",
        note = "Note",
        enabled = true,
    )
}
