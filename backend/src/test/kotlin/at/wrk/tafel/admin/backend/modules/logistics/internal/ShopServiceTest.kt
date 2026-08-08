package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.database.model.logistics.FoodUnit
import at.wrk.tafel.admin.backend.database.model.logistics.RouteEntity
import at.wrk.tafel.admin.backend.database.model.logistics.RouteRepository
import at.wrk.tafel.admin.backend.database.model.logistics.RouteStopEntity
import at.wrk.tafel.admin.backend.database.model.logistics.ShopAddress
import at.wrk.tafel.admin.backend.database.model.logistics.ShopEntity
import at.wrk.tafel.admin.backend.database.model.logistics.ShopRepository
import at.wrk.tafel.admin.backend.modules.base.exception.BusinessRuleException
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.logistics.model.RouteShopItem
import at.wrk.tafel.admin.backend.modules.logistics.model.ShopRequest
import at.wrk.tafel.admin.backend.modules.logistics.model.ShopResponse
import at.wrk.tafel.admin.backend.modules.logistics.testRoute1
import at.wrk.tafel.admin.backend.modules.logistics.testShop1
import at.wrk.tafel.admin.backend.modules.logistics.testShop2
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.data.repository.findByIdOrNull
import java.time.LocalTime

@ExtendWith(MockKExtension::class)
class ShopServiceTest {

    @RelaxedMockK
    private lateinit var routeRepository: RouteRepository

    @RelaxedMockK
    private lateinit var shopRepository: ShopRepository

    @InjectMockKs
    private lateinit var service: ShopService

    @Test
    fun `get shops for route when route doesnt exist`() {
        val routeId = testRoute1.id!!
        every { routeRepository.findByIdOrNull(routeId) } returns null

        val exception = assertThrows<NotFoundException> {
            service.getShopsForRouteId(routeId)
        }

        assertThat(exception.body.detail).isEqualTo("Route $routeId nicht gefunden!")
    }

    @Test
    fun `get shops with proper mapping`() {
        val routeId = testRoute1.id!!
        every { routeRepository.findByIdOrNull(routeId) } returns testRoute1

        val shops = service.getShopsForRouteId(routeId)

        assertThat(shops).isEqualTo(
            testRoute1.stops
                .sortedBy { it.time }
                .filter { it.shop != null }
                .map {
                    RouteShopItem(
                        id = it.shop!!.id!!,
                        number = it.shop!!.number,
                        name = it.shop!!.name,
                        address = "${it.shop!!.address.street}, ${it.shop!!.address.postalCode} ${it.shop!!.address.city}",
                    )
                },
        )
    }

    @Test
    fun `get shops for route skips disabled shops`() {
        val disabledShop = ShopEntity(
            number = 77,
            name = "Closed down",
            address = ShopAddress(street = "Street 7", postalCode = 1070, city = "Wien"),
            enabled = false,
        ).apply { id = 77 }
        val route = RouteEntity(number = 7.0, name = "Route 7").apply {
            id = 7
            stops = mutableListOf(
                RouteStopEntity(route = this, time = LocalTime.of(14, 0)).apply { shop = testShop1 },
                RouteStopEntity(route = this, time = LocalTime.of(14, 30)).apply { shop = disabledShop },
            )
        }
        every { routeRepository.findByIdOrNull(7L) } returns route

        val shops = service.getShopsForRouteId(7L)

        assertThat(shops).extracting<Long> { it.id }.containsExactly(testShop1.id)
    }

    @Test
    fun `get all shops sorted by number`() {
        every { shopRepository.findAll() } returns listOf(testShop2, testShop1)

        val shops = service.getAllShops()

        assertThat(shops).containsExactly(
            ShopResponse(
                id = testShop1.id,
                number = testShop1.number,
                name = testShop1.name,
                addressStreet = testShop1.address.street,
                addressPostalCode = testShop1.address.postalCode,
                addressCity = testShop1.address.city,
                foodUnit = testShop1.foodUnit,
                phone = null,
                contactPerson = null,
                note = null,
                enabled = true,
            ),
            ShopResponse(
                id = testShop2.id,
                number = testShop2.number,
                name = testShop2.name,
                addressStreet = testShop2.address.street,
                addressPostalCode = testShop2.address.postalCode,
                addressCity = testShop2.address.city,
                foodUnit = testShop2.foodUnit,
                phone = null,
                contactPerson = null,
                note = null,
                enabled = true,
            ),
        )
    }

    @Test
    fun `create shop`() {
        val request = shopRequest(number = 500)
        every { shopRepository.findByNumber(500) } returns null
        every { shopRepository.save(any()) } answers {
            (firstArg() as ShopEntity).apply { id = 42 }
        }

        val result = service.createShop(request)

        assertThat(result).isEqualTo(
            ShopResponse(
                id = 42,
                number = 500,
                name = request.name,
                addressStreet = request.addressStreet,
                addressPostalCode = request.addressPostalCode,
                addressCity = request.addressCity,
                foodUnit = request.foodUnit,
                phone = request.phone,
                contactPerson = request.contactPerson,
                note = request.note,
                enabled = request.enabled,
            ),
        )
    }

    @Test
    fun `create shop fails when the number is already taken`() {
        every { shopRepository.findByNumber(500) } returns testShop1

        val exception = assertThrows<BusinessRuleException> { service.createShop(shopRequest(number = 500)) }

        assertThat(exception.body.detail).isEqualTo("Markt-Nummer 500 ist bereits vergeben!")
    }

    @Test
    fun `update shop`() {
        val existingEntity = ShopEntity(
            number = 100,
            name = "Old name",
            address = ShopAddress(street = "Old street", postalCode = 1010, city = "Old city"),
        ).apply { id = 99 }
        val request = shopRequest(number = 500).copy(id = 99, enabled = false, foodUnit = FoodUnit.KG)

        every { shopRepository.findByNumber(500) } returns null
        every { shopRepository.findByIdOrNull(99L) } returns existingEntity
        every { shopRepository.save(any()) } answers { firstArg() as ShopEntity }

        val result = service.updateShop(99L, request)

        assertThat(result).isEqualTo(
            ShopResponse(
                id = 99,
                number = 500,
                name = request.name,
                addressStreet = request.addressStreet,
                addressPostalCode = request.addressPostalCode,
                addressCity = request.addressCity,
                foodUnit = FoodUnit.KG,
                phone = request.phone,
                contactPerson = request.contactPerson,
                note = request.note,
                enabled = false,
            ),
        )
    }

    @Test
    fun `update shop keeps its own number`() {
        val existingEntity = ShopEntity(
            number = 500,
            name = "Old name",
            address = ShopAddress(street = "Old street", postalCode = 1010, city = "Old city"),
        ).apply { id = 99 }

        every { shopRepository.findByNumber(500) } returns existingEntity
        every { shopRepository.findByIdOrNull(99L) } returns existingEntity
        every { shopRepository.save(any()) } answers { firstArg() as ShopEntity }

        val result = service.updateShop(99L, shopRequest(number = 500).copy(id = 99))

        assertThat(result.number).isEqualTo(500)
    }

    @Test
    fun `update shop fails when the number belongs to another shop`() {
        every { shopRepository.findByNumber(500) } returns testShop1

        val exception = assertThrows<BusinessRuleException> {
            service.updateShop(99L, shopRequest(number = 500).copy(id = 99))
        }

        assertThat(exception.body.detail).isEqualTo("Markt-Nummer 500 ist bereits vergeben!")
    }

    @Test
    fun `update shop throws exception when not found`() {
        every { shopRepository.findByNumber(500) } returns null
        every { shopRepository.findByIdOrNull(99L) } returns null

        val exception = assertThrows<NotFoundException> {
            service.updateShop(99L, shopRequest(number = 500).copy(id = 99))
        }

        assertThat(exception.body.detail).isEqualTo("Shop with id 99 not found")
    }

    private fun shopRequest(number: Int) = ShopRequest(
        id = null,
        number = number,
        name = "New Shop",
        addressStreet = "New street 1",
        addressPostalCode = 1100,
        addressCity = "Wien",
        foodUnit = FoodUnit.BOX,
        phone = "01 234 56 78",
        contactPerson = "Fr. Musterfrau",
        note = "Note",
        enabled = true,
    )
}
