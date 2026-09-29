package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCollectionEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCollectionReturnItemEntity
import at.wrk.tafel.admin.backend.database.model.logistics.RouteEntity
import at.wrk.tafel.admin.backend.database.model.logistics.ShopAddress
import at.wrk.tafel.admin.backend.database.model.logistics.ShopEntity
import at.wrk.tafel.admin.backend.modules.logistics.model.ReturnBoxesRouteItem
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

@Transactional
class ReturnBoxesServiceIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var testEntityManager: TestEntityManager

    @Autowired
    private lateinit var returnBoxesService: ReturnBoxesService

    private lateinit var route: RouteEntity
    private lateinit var shop: ShopEntity

    @BeforeEach
    fun beforeEach() {
        val user = UserEntity(
            username = "return-boxes-it",
            password = "irrelevant",
            personnelNumber = "return-boxes-it",
            firstname = "Return",
            lastname = "Boxes",
        )
        testEntityManager.persist(user)
        SecurityContextHolder.getContext().authentication = TafelJwtAuthentication("TOKEN", "return-boxes-it", true)

        shop = ShopEntity(
            number = 93_001,
            name = "IT Shop 93001",
            address = ShopAddress(street = "Street 1", postalCode = 1100, city = "Wien"),
        )
        testEntityManager.persist(shop)
        route = RouteEntity(number = 93.1, name = "IT Return Boxes Route")
        testEntityManager.persist(route)

        val lastWeek = DistributionEntity(startedAt = LocalDateTime.now().minusDays(14), startedByUser = user).apply { endedAt = startedAt.plusHours(8) }
        val weekBefore = DistributionEntity(startedAt = LocalDateTime.now().minusDays(7), startedByUser = user).apply { endedAt = startedAt.plusHours(8) }
        testEntityManager.persist(lastWeek)
        testEntityManager.persist(weekBefore)
        // two trips, neither confirmed: what was not taken along the first time is still out
        persistCollection(lastWeek, "Graue Kisten", 4)
        persistCollection(weekBefore, "Ströck Kisten", 2)
        testEntityManager.flush()
        testEntityManager.clear()
    }

    @AfterEach
    fun afterEach() {
        SecurityContextHolder.clearContext()
    }

    @Test
    fun `boxes not confirmed back carry over from every earlier trip`() {
        val boxes = ownRoute().shops.single().boxes

        assertThat(boxes).extracting<String> { it.description }.containsExactly("Graue Kisten", "Ströck Kisten")
        assertThat(boxes).allMatch { !it.returned }
    }

    @Test
    fun `confirming a shop's boxes settles all of its trips and can be taken back the same day`() {
        val settled = returnBoxesService.setReturned(route.id!!, shop.id!!, true)
        testEntityManager.flush()
        testEntityManager.clear()

        assertThat(settled.routes.single { it.routeId == route.id }.shops.single().boxes).allMatch { it.returned }

        val restored = returnBoxesService.setReturned(route.id!!, shop.id!!, false)

        assertThat(restored.routes.single { it.routeId == route.id }.shops.single().boxes).allMatch { !it.returned }
    }

    @Test
    fun `a zero amount is not an outstanding box`() {
        persistCollection(
            DistributionEntity(
                startedAt = LocalDateTime.now().minusDays(21),
                startedByUser = testEntityManager.entityManager
                    .createQuery("select u from User u where u.username = :name", UserEntity::class.java)
                    .setParameter("name", "return-boxes-it")
                    .singleResult,
            ).apply { endedAt = startedAt.plusHours(8) }.also { testEntityManager.persist(it) },
            "Leere Kisten",
            0,
        )
        testEntityManager.flush()
        testEntityManager.clear()

        assertThat(ownRoute().shops.single().boxes).extracting<String> { it.description }
            .doesNotContain("Leere Kisten")
    }

    private fun ownRoute(): ReturnBoxesRouteItem = returnBoxesService.getReturnBoxes().routes.single { it.routeId == route.id }

    private fun persistCollection(distribution: DistributionEntity, description: String, amount: Int) {
        testEntityManager.persist(
            FoodCollectionEntity(distribution = distribution, route = route).apply {
                returnItems = listOf(FoodCollectionReturnItemEntity(shop = shop, description = description, amount = amount))
            },
        )
    }
}
