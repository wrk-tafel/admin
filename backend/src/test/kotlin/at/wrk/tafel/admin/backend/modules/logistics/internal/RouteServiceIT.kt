package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.database.model.logistics.FoodUnit
import at.wrk.tafel.admin.backend.database.model.logistics.ShopAddress
import at.wrk.tafel.admin.backend.database.model.logistics.ShopEntity
import at.wrk.tafel.admin.backend.modules.logistics.model.RouteRequest
import at.wrk.tafel.admin.backend.modules.logistics.model.RouteStopItem
import at.wrk.tafel.admin.backend.modules.logistics.model.ShopRequest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager
import org.springframework.transaction.annotation.Transactional
import java.time.LocalTime

@Transactional
class RouteServiceIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var testEntityManager: TestEntityManager

    @Autowired
    private lateinit var routeService: RouteService

    @Autowired
    private lateinit var shopService: ShopService

    @Test
    fun `create route persists its stops`() {
        val shop = persistShop(number = 91_001)

        val created = routeService.createRoute(
            RouteRequest(
                id = null,
                number = 91.1,
                name = "IT Route",
                note = "IT note",
                enabled = true,
                stops = listOf(
                    RouteStopItem(id = null, time = LocalTime.of(14, 0), shopId = shop.id, description = "First stop"),
                    RouteStopItem(id = null, time = LocalTime.of(14, 30), shopId = null, description = "Break"),
                ),
            ),
        )
        testEntityManager.flush()
        testEntityManager.clear()

        val reloaded = routeService.getAllRoutes().single { it.id == created.id }
        assertThat(reloaded.name).isEqualTo("IT Route")
        assertThat(reloaded.stops).extracting<Long?> { it.shopId }.containsExactly(shop.id, null)
        assertThat(reloaded.stops).extracting<String?> { it.description }.containsExactly("First stop", "Break")
    }

    @Test
    fun `update route can re-use a removed stop's shop and time`() {
        val shopA = persistShop(number = 91_002)
        val shopB = persistShop(number = 91_003)
        val created = routeService.createRoute(
            RouteRequest(
                id = null,
                number = 91.2,
                name = "IT Route",
                note = null,
                enabled = true,
                stops = listOf(
                    RouteStopItem(id = null, time = LocalTime.of(14, 0), shopId = shopA.id, description = null),
                    RouteStopItem(id = null, time = LocalTime.of(14, 30), shopId = shopB.id, description = null),
                ),
            ),
        )
        testEntityManager.flush()
        testEntityManager.clear()

        // swaps the two shops' times - both routes_stops unique constraints would be violated if the
        // removed rows were still around when the new ones get inserted
        val updated = routeService.updateRoute(
            created.id!!,
            RouteRequest(
                id = created.id,
                number = 91.2,
                name = "IT Route",
                note = null,
                enabled = true,
                stops = listOf(
                    RouteStopItem(id = null, time = LocalTime.of(14, 0), shopId = shopB.id, description = null),
                    RouteStopItem(id = null, time = LocalTime.of(14, 30), shopId = shopA.id, description = null),
                ),
            ),
        )
        testEntityManager.flush()
        testEntityManager.clear()

        assertThat(updated.stops).extracting<Long?> { it.shopId }.containsExactly(shopB.id, shopA.id)
        val reloaded = routeService.getAllRoutes().single { it.id == created.id }
        assertThat(reloaded.stops).extracting<Long?> { it.shopId }.containsExactly(shopB.id, shopA.id)
    }

    @Test
    fun `shops of a route are only served while the shop is enabled`() {
        val shop = persistShop(number = 91_004)
        val created = routeService.createRoute(
            RouteRequest(
                id = null,
                number = 91.3,
                name = "IT Route",
                note = null,
                enabled = true,
                stops = listOf(RouteStopItem(id = null, time = LocalTime.of(14, 0), shopId = shop.id, description = null)),
            ),
        )
        testEntityManager.flush()
        val routeId = created.id!!

        assertThat(shopService.getShopsForRouteId(routeId)).extracting<Long> { it.id }.containsExactly(shop.id)

        shopService.updateShop(shop.id!!, shopRequest(number = 91_004).copy(id = shop.id, enabled = false))
        testEntityManager.flush()
        testEntityManager.clear()

        assertThat(shopService.getShopsForRouteId(routeId)).isEmpty()
    }

    private fun persistShop(number: Int): ShopEntity {
        val shop = ShopEntity(
            number = number,
            name = "IT Shop $number",
            address = ShopAddress(street = "Street 1", postalCode = 1100, city = "Wien"),
        )
        testEntityManager.persist(shop)
        return shop
    }

    private fun shopRequest(number: Int) = ShopRequest(
        id = null,
        number = number,
        name = "IT Shop $number",
        addressStreet = "Street 1",
        addressPostalCode = 1100,
        addressCity = "Wien",
        foodUnit = FoodUnit.BOX,
        phone = null,
        contactPerson = null,
        note = null,
        enabled = true,
    )
}
