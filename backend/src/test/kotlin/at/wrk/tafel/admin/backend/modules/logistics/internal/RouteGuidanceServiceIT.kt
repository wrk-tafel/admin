package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCollectionEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCollectionReturnItemEntity
import at.wrk.tafel.admin.backend.database.model.logistics.RouteEntity
import at.wrk.tafel.admin.backend.database.model.logistics.RouteStopCompletionRepository
import at.wrk.tafel.admin.backend.database.model.logistics.RouteStopEntity
import at.wrk.tafel.admin.backend.database.model.logistics.ShopAddress
import at.wrk.tafel.admin.backend.database.model.logistics.ShopEntity
import at.wrk.tafel.admin.backend.modules.logistics.model.RouteRequest
import at.wrk.tafel.admin.backend.modules.logistics.model.RouteStopItem
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime

@Transactional
class RouteGuidanceServiceIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var testEntityManager: TestEntityManager

    @Autowired
    private lateinit var routeService: RouteService

    @Autowired
    private lateinit var routeGuidanceService: RouteGuidanceService

    @Autowired
    private lateinit var routeStopCompletionRepository: RouteStopCompletionRepository

    @BeforeEach
    fun beforeEach() {
        val employee = EmployeeEntity(
            personnelNumber = "guidance-it",
            firstname = "Guidance",
            lastname = "Driver",
        )
        testEntityManager.persist(
            UserEntity(username = "guidance-it", password = "irrelevant", employee = employee),
        )

        SecurityContextHolder.getContext().authentication = TafelJwtAuthentication("TOKEN", "guidance-it", true)
    }

    @AfterEach
    fun afterEach() {
        SecurityContextHolder.clearContext()
    }

    @Test
    fun `completing a stop is persisted and read back for today`() {
        val routeId = persistRoute(number = 92.1, shopNumber = 92_001)
        val stopId = routeGuidanceService.getGuidance(routeId).stops.first().stopId

        val justCompleted = routeGuidanceService.setCompletion(routeId, stopId, true)
        // the completion timestamp has to be on the answer to the tick itself, not only on the next
        // read - @CreationTimestamp is only assigned once the insert is written
        assertThat(justCompleted.completedAt).isNotNull()
        testEntityManager.flush()
        testEntityManager.clear()

        val stops = routeGuidanceService.getGuidance(routeId).stops
        assertThat(stops.first().completed).isTrue()
        assertThat(stops.first().completedBy).isEqualTo("Guidance Driver")
        assertThat(stops.last().completed).isFalse()
    }

    @Test
    fun `completing the same stop twice keeps a single row`() {
        val routeId = persistRoute(number = 92.2, shopNumber = 92_002)
        val stopId = routeGuidanceService.getGuidance(routeId).stops.first().stopId

        routeGuidanceService.setCompletion(routeId, stopId, true)
        testEntityManager.flush()
        routeGuidanceService.setCompletion(routeId, stopId, true)
        testEntityManager.flush()
        testEntityManager.clear()

        assertThat(routeStopCompletionRepository.findAllByRouteStopIdInAndCompletionDate(listOf(stopId), LocalDate.now()))
            .hasSize(1)
    }

    @Test
    fun `un-completing a stop removes the row again`() {
        val routeId = persistRoute(number = 92.3, shopNumber = 92_003)
        val stopId = routeGuidanceService.getGuidance(routeId).stops.first().stopId
        routeGuidanceService.setCompletion(routeId, stopId, true)
        testEntityManager.flush()

        routeGuidanceService.setCompletion(routeId, stopId, false)
        testEntityManager.flush()
        testEntityManager.clear()

        assertThat(routeGuidanceService.getGuidance(routeId).stops.first().completed).isFalse()
        assertThat(routeStopCompletionRepository.findAllByRouteStopIdInAndCompletionDate(listOf(stopId), LocalDate.now()))
            .isEmpty()
    }

    @Test
    fun `completions are dropped when a stop's own content actually changes`() {
        val routeId = persistRoute(number = 92.4, shopNumber = 92_004)
        val stopId = routeGuidanceService.getGuidance(routeId).stops.first().stopId
        routeGuidanceService.setCompletion(routeId, stopId, true)
        testEntityManager.flush()
        testEntityManager.clear()

        // neither of the new stops matches either existing stop's content, so both are replaced -
        // the completion has nothing left to hang off
        routeService.updateRoute(
            routeId,
            RouteRequest(
                id = routeId,
                number = 92.4,
                name = "IT Guidance Route",
                note = null,
                enabled = true,
                stops = listOf(RouteStopItem(id = null, time = LocalTime.of(11, 0), shopId = null, description = "Pause")),
            ),
        )
        testEntityManager.flush()
        testEntityManager.clear()

        assertThat(routeStopCompletionRepository.findAllByRouteStopIdInAndCompletionDate(listOf(stopId), LocalDate.now()))
            .isEmpty()
    }

    @Test
    fun `completions survive a route edit that leaves the stops themselves unchanged`() {
        // Regression test for #3527: a pure metadata edit (here: renaming the route) must not wipe
        // today's driver-guidance progress just because updateRoute() touches the stops collection.
        val routeId = persistRoute(number = 92.5, shopNumber = 92_005)
        val stopId = routeGuidanceService.getGuidance(routeId).stops.first().stopId
        routeGuidanceService.setCompletion(routeId, stopId, true)
        testEntityManager.flush()
        testEntityManager.clear()

        val existingStops = routeService.getAllRoutes().single { it.id == routeId }.stops
            .map { RouteStopItem(id = null, time = it.time, shopId = it.shopId, description = it.description) }

        routeService.updateRoute(
            routeId,
            RouteRequest(
                id = routeId,
                number = 92.5,
                name = "IT Guidance Route (renamed)",
                note = null,
                enabled = true,
                stops = existingStops,
            ),
        )
        testEntityManager.flush()
        testEntityManager.clear()

        assertThat(routeStopCompletionRepository.findAllByRouteStopIdInAndCompletionDate(listOf(stopId), LocalDate.now()))
            .hasSize(1)
        assertThat(routeGuidanceService.getGuidance(routeId).stops.first { it.stopId == stopId }.completed).isTrue()
    }

    @Test
    fun `guidance hands out the return boxes of the last trip and skips the running distribution`() {
        val shop = ShopEntity(
            number = 92_005,
            name = "IT Shop 92005",
            address = ShopAddress(street = "Street 1", postalCode = 1100, city = "Wien"),
        )
        testEntityManager.persist(shop)
        val route = RouteEntity(number = 92.5, name = "IT Guidance Route").apply {
            stops = mutableListOf(RouteStopEntity(route = this, time = LocalTime.of(9, 0)).apply { this.shop = shop })
        }
        testEntityManager.persist(route)

        val lastDistribution = persistDistribution(startedAt = LocalDateTime.now().minusDays(7))
        testEntityManager.persist(
            FoodCollectionEntity(distribution = lastDistribution, route = route).apply {
                returnItems = listOf(
                    FoodCollectionReturnItemEntity(shop = shop, description = "Graue Kisten", amount = 4),
                    FoodCollectionReturnItemEntity(shop = shop, description = "Ströck Kisten", amount = 0),
                )
            },
        )
        // today's own collection exists as soon as anyone opens the recording screen and must not be
        // mistaken for the trip whose boxes are still standing around
        val runningDistribution = persistDistribution(startedAt = LocalDateTime.now())
        testEntityManager.persist(FoodCollectionEntity(distribution = runningDistribution, route = route))
        testEntityManager.flush()
        testEntityManager.clear()

        val guidance = routeGuidanceService.getGuidance(route.id!!)

        assertThat(guidance.returnItemsFrom).isEqualTo(lastDistribution.startedAt.toLocalDate())
        assertThat(guidance.stops.single().returnItems)
            .extracting<String> { it.description }
            .containsExactly("Graue Kisten")
        assertThat(guidance.unassignedReturnItems).isEmpty()
    }

    private fun persistDistribution(startedAt: LocalDateTime): DistributionEntity {
        val user = testEntityManager.entityManager
            .createQuery("select u from User u where u.username = :name", UserEntity::class.java)
            .setParameter("name", "guidance-it")
            .singleResult
        val distribution = DistributionEntity(startedAt = startedAt, startedByUser = user)
        testEntityManager.persist(distribution)
        return distribution
    }

    private fun persistRoute(number: Double, shopNumber: Int): Long {
        val shop = ShopEntity(
            number = shopNumber,
            name = "IT Shop $shopNumber",
            address = ShopAddress(street = "Street 1", postalCode = 1100, city = "Wien"),
        )
        testEntityManager.persist(shop)

        val created = routeService.createRoute(
            RouteRequest(
                id = null,
                number = number,
                name = "IT Guidance Route",
                note = null,
                enabled = true,
                stops = listOf(
                    RouteStopItem(id = null, time = LocalTime.of(9, 0), shopId = shop.id, description = null),
                    RouteStopItem(id = null, time = LocalTime.of(10, 0), shopId = null, description = "Pause"),
                ),
            ),
        )
        testEntityManager.flush()
        return created.id!!
    }
}
