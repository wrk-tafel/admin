package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.database.common.lock.AdvisoryLockKey
import at.wrk.tafel.admin.backend.database.common.lock.AdvisoryLockService
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCollectionEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCollectionRepository
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCollectionReturnItemEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodUnit
import at.wrk.tafel.admin.backend.database.model.logistics.RouteEntity
import at.wrk.tafel.admin.backend.database.model.logistics.RouteRepository
import at.wrk.tafel.admin.backend.database.model.logistics.RouteStopCompletionEntity
import at.wrk.tafel.admin.backend.database.model.logistics.RouteStopCompletionRepository
import at.wrk.tafel.admin.backend.database.model.logistics.RouteStopEntity
import at.wrk.tafel.admin.backend.database.model.logistics.ShopAddress
import at.wrk.tafel.admin.backend.database.model.logistics.ShopEntity
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.logistics.events.RouteAtLastStopEvent
import at.wrk.tafel.admin.backend.security.testUserEntity
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.context.ApplicationEventPublisher
import org.springframework.data.repository.findByIdOrNull
import org.springframework.security.core.context.SecurityContextHolder
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime

@ExtendWith(MockKExtension::class)
class RouteGuidanceServiceTest {

    @RelaxedMockK
    private lateinit var routeRepository: RouteRepository

    @RelaxedMockK
    private lateinit var routeStopCompletionRepository: RouteStopCompletionRepository

    @RelaxedMockK
    private lateinit var foodCollectionRepository: FoodCollectionRepository

    @RelaxedMockK
    private lateinit var distributionRepository: DistributionRepository

    @RelaxedMockK
    private lateinit var userRepository: UserRepository

    @RelaxedMockK
    private lateinit var eventPublisher: ApplicationEventPublisher

    @RelaxedMockK
    private lateinit var advisoryLockService: AdvisoryLockService

    @InjectMockKs
    private lateinit var service: RouteGuidanceService

    private lateinit var route: RouteEntity

    @BeforeEach
    fun beforeEach() {
        route = guidanceTestRoute()

        every { routeRepository.findByIdOrNull(1) } returns route
        every { routeRepository.findByIdOrNull(999) } returns null
        every { routeStopCompletionRepository.findAllByRouteStopIdInAndCompletionDate(any(), any()) } returns emptyList()
        every { routeStopCompletionRepository.findByRouteStopIdAndCompletionDate(any(), any()) } returns null
        every { routeStopCompletionRepository.saveAndFlush(any()) } answers { firstArg() as RouteStopCompletionEntity }
        every { userRepository.findByUsername(any()) } returns testUserEntity
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns null
        every {
            foodCollectionRepository.findFirstByRouteIdAndDistributionIdNotOrderByDistributionStartedAtDescIdDesc(any(), any())
        } returns null
        every { advisoryLockService.withLock<Any>(any(), any()) } answers { secondArg<() -> Any>().invoke() }

        SecurityContextHolder.getContext().authentication =
            TafelJwtAuthentication("TOKEN", testUserEntity.username, true)
    }

    @AfterEach
    fun afterEach() {
        SecurityContextHolder.clearContext()
    }

    @Test
    fun `guidance lists the stops ordered by time`() {
        val guidance = service.getGuidance(1)

        assertThat(guidance.routeName).isEqualTo("Route 1")
        assertThat(guidance.routeNumber).isEqualTo(1.0)
        assertThat(guidance.routeNote).isEqualTo("Note 1")
        assertThat(guidance.date).isEqualTo(LocalDate.now())
        assertThat(guidance.stops).extracting<LocalTime> { it.time }
            .containsExactly(LocalTime.of(8, 0), LocalTime.of(9, 0), LocalTime.of(10, 0))
    }

    @Test
    fun `guidance carries the full shop details a driver needs`() {
        val shopStop = service.getGuidance(1).stops.first()

        assertThat(shopStop.shop).isNotNull
        assertThat(shopStop.shop!!.name).isEqualTo("Billa Mitte")
        assertThat(shopStop.shop!!.address).isEqualTo("Hauptstrasse 5, 1010 Wien")
        assertThat(shopStop.shop!!.phone).isEqualTo("01 234567")
        assertThat(shopStop.shop!!.contactPerson).isEqualTo("Frau Huber")
        assertThat(shopStop.shop!!.note).isEqualTo("Klingeln bei der Rampe")
        assertThat(shopStop.shop!!.foodUnit).isEqualTo(FoodUnit.BOX)
    }

    @Test
    fun `guidance keeps a stop without a shop`() {
        val pauseStop = service.getGuidance(1).stops[1]

        assertThat(pauseStop.shop).isNull()
        assertThat(pauseStop.description).isEqualTo("Pause")
    }

    @Test
    fun `guidance merges todays completions into the stops`() {
        val completedAt = LocalDateTime.of(2026, 8, 9, 8, 15)
        every {
            routeStopCompletionRepository.findAllByRouteStopIdInAndCompletionDate(listOf(11, 22, 33), LocalDate.now())
        } returns listOf(
            RouteStopCompletionEntity(routeStop = route.stops.first { it.id == 11L }, completionDate = LocalDate.now())
                .apply {
                    id = 1
                    createdAt = completedAt
                    employee = testUserEntity.employee
                },
        )

        val stops = service.getGuidance(1).stops

        assertThat(stops[0].completed).isTrue()
        assertThat(stops[0].completedAt).isEqualTo(completedAt)
        assertThat(stops[0].completedBy).isEqualTo("test-firstname test-lastname")
        assertThat(stops[1].completed).isFalse()
        assertThat(stops[1].completedAt).isNull()
        assertThat(stops[1].completedBy).isNull()
    }

    @Test
    fun `guidance hands the last trip's return boxes to the stop they go back to`() {
        givenPreviousCollectionWithReturnItems()

        val guidance = service.getGuidance(1)

        assertThat(guidance.returnItemsFrom).isEqualTo(LocalDate.of(2026, 8, 2))
        assertThat(guidance.stops[0].returnItems)
            .extracting<String> { it.description }
            .containsExactly("Bananenkartons", "Graue Kisten")
        assertThat(guidance.stops[0].returnItems.first().amount).isEqualTo(2)
        assertThat(guidance.stops[0].returnItems.first().shopName).isEqualTo("Billa Mitte")
        assertThat(guidance.stops[1].returnItems).isEmpty()
    }

    @Test
    fun `guidance leaves out a return box that was recorded with amount zero`() {
        givenPreviousCollectionWithReturnItems()

        val guidance = service.getGuidance(1)

        assertThat(guidance.stops[2].returnItems).isEmpty()
    }

    @Test
    fun `guidance reports return boxes for a shop the route no longer stops at`() {
        givenPreviousCollectionWithReturnItems()

        val guidance = service.getGuidance(1)

        assertThat(guidance.unassignedReturnItems)
            .extracting<String> { it.shopName }
            .containsExactly("Hofer Alt")
        assertThat(guidance.unassignedReturnItems.first().amount).isEqualTo(5)
    }

    @Test
    fun `guidance reports no return date when the last trip brought nothing back`() {
        val guidance = service.getGuidance(1)

        assertThat(guidance.returnItemsFrom).isNull()
        assertThat(guidance.unassignedReturnItems).isEmpty()
        assertThat(guidance.stops).allSatisfy { assertThat(it.returnItems).isEmpty() }
    }

    @Test
    fun `guidance skips the running distribution when looking for the last trip`() {
        val currentDistribution = distribution(id = 77, startedAt = LocalDateTime.of(2026, 8, 9, 6, 0))
        every { distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc() } returns currentDistribution

        service.getGuidance(1)

        verify {
            foodCollectionRepository
                .findFirstByRouteIdAndDistributionIdNotOrderByDistributionStartedAtDescIdDesc(1, 77)
        }
    }

    @Test
    fun `ticking a stop off keeps its return boxes on the answer`() {
        givenPreviousCollectionWithReturnItems()

        val stop = service.setCompletion(1, 11, true)

        assertThat(stop.returnItems).extracting<String> { it.description }
            .containsExactly("Bananenkartons", "Graue Kisten")
    }

    @Test
    fun `guidance fails for an unknown route`() {
        val exception = assertThrows<NotFoundException> { service.getGuidance(999) }

        assertThat(exception.body.detail).isEqualTo("Route 999 nicht gefunden!")
    }

    @Test
    fun `completing a stop stores it for today with the logged-in employee`() {
        val stop = service.setCompletion(1, 11, true)

        assertThat(stop.stopId).isEqualTo(11)
        assertThat(stop.completed).isTrue()
        assertThat(stop.completedBy).isEqualTo("test-firstname test-lastname")
        verify {
            routeStopCompletionRepository.saveAndFlush(
                match<RouteStopCompletionEntity> {
                    it.routeStop.id == 11L &&
                        it.completionDate == LocalDate.now() &&
                        it.employee == testUserEntity.employee
                },
            )
        }
        verify { advisoryLockService.withLock<Any>(AdvisoryLockKey.ROUTE_STOP_COMPLETION, any()) }
    }

    @Test
    fun `completing an already completed stop keeps the original completion`() {
        val existing = RouteStopCompletionEntity(
            routeStop = route.stops.first { it.id == 11L },
            completionDate = LocalDate.now(),
        ).apply {
            id = 1
            createdAt = LocalDateTime.of(2026, 8, 9, 8, 15)
            employee = testUserEntity.employee
        }
        every { routeStopCompletionRepository.findByRouteStopIdAndCompletionDate(11, LocalDate.now()) } returns existing

        val stop = service.setCompletion(1, 11, true)

        assertThat(stop.completedAt).isEqualTo(LocalDateTime.of(2026, 8, 9, 8, 15))
        verify(exactly = 0) { routeStopCompletionRepository.saveAndFlush(any()) }
    }

    @Test
    fun `un-completing a stop removes todays completion`() {
        every { routeStopCompletionRepository.findByRouteStopIdAndCompletionDate(11, LocalDate.now()) } returns
            RouteStopCompletionEntity(
                routeStop = route.stops.first { it.id == 11L },
                completionDate = LocalDate.now(),
            ).apply { id = 1 }

        val stop = service.setCompletion(1, 11, false)

        assertThat(stop.completed).isFalse()
        assertThat(stop.completedAt).isNull()
        verify { routeStopCompletionRepository.deleteByRouteStopIdAndCompletionDate(11, LocalDate.now()) }
    }

    @Test
    fun `un-completing a stop that was never completed deletes nothing`() {
        val stop = service.setCompletion(1, 11, false)

        assertThat(stop.completed).isFalse()
        verify(exactly = 0) { routeStopCompletionRepository.deleteByRouteStopIdAndCompletionDate(any(), any()) }
    }

    @Test
    fun `completing a stop of another route fails`() {
        val exception = assertThrows<NotFoundException> { service.setCompletion(1, 44, true) }

        assertThat(exception.body.detail).isEqualTo("Stopp 44 gehört nicht zur Route 1!")
    }

    @Test
    fun `arriving at the last stop announces that the route is on its way back`() {
        givenCompletedStops(11, 22)
        every { routeRepository.markLastStopNotified(1, LocalDate.now()) } returns 1

        service.setCompletion(1, 22, true)

        verify {
            eventPublisher.publishEvent(
                RouteAtLastStopEvent(routeId = 1, routeName = "Route 1", remainingStopName = "Denns Bio"),
            )
        }
    }

    @Test
    fun `a route whose last stop is done too is no longer at its last stop`() {
        givenCompletedStops(11, 22, 33)
        every { routeRepository.markLastStopNotified(any(), any()) } returns 1

        service.setCompletion(1, 33, true)

        verify(exactly = 0) { eventPublisher.publishEvent(any<RouteAtLastStopEvent>()) }
    }

    @Test
    fun `a route with stops still open in the middle is not at its last stop`() {
        givenCompletedStops(22)
        every { routeRepository.markLastStopNotified(any(), any()) } returns 1

        service.setCompletion(1, 22, true)

        verify(exactly = 0) { eventPublisher.publishEvent(any<RouteAtLastStopEvent>()) }
    }

    /**
     * The marker is what makes the announcement happen once a day - a driver who takes the
     * second-to-last stop back and ticks it off again passes the same point twice.
     */
    @Test
    fun `the last stop is announced only the first time it is reached`() {
        givenCompletedStops(11, 22)
        every { routeRepository.markLastStopNotified(1, LocalDate.now()) } returns 0

        service.setCompletion(1, 22, true)

        verify(exactly = 0) { eventPublisher.publishEvent(any<RouteAtLastStopEvent>()) }
    }

    @Test
    fun `taking a stop back never announces anything`() {
        givenCompletedStops(11, 22)
        every { routeRepository.markLastStopNotified(any(), any()) } returns 1

        service.setCompletion(1, 11, false)

        verify(exactly = 0) { eventPublisher.publishEvent(any<RouteAtLastStopEvent>()) }
        verify(exactly = 0) { routeRepository.markLastStopNotified(any(), any()) }
    }

    private fun givenCompletedStops(vararg stopIds: Long) {
        every { routeStopCompletionRepository.findAllByRouteStopIdInAndCompletionDate(any(), LocalDate.now()) } returns
            stopIds.map { stopId ->
                RouteStopCompletionEntity(
                    routeStop = route.stops.first { it.id == stopId },
                    completionDate = LocalDate.now(),
                ).apply { id = stopId }
            }
    }

    private fun distribution(id: Long, startedAt: LocalDateTime) = DistributionEntity(
        startedAt = startedAt,
        startedByUser = testUserEntity,
    ).apply { this.id = id }

    private fun givenPreviousCollectionWithReturnItems() {
        val billaShop = route.stops.first { it.id == 11L }.shop!!
        val dennsShop = route.stops.first { it.id == 33L }.shop!!
        val retiredShop = ShopEntity(
            number = 14,
            name = "Hofer Alt",
            address = ShopAddress(street = "Alte Gasse 1", postalCode = 1030, city = "Wien"),
        ).apply { id = 14 }

        val previousDistribution = distribution(id = 70, startedAt = LocalDateTime.of(2026, 8, 2, 14, 0))
            .apply { endedAt = LocalDateTime.of(2026, 8, 2, 22, 0) }
        val collection = FoodCollectionEntity(distribution = previousDistribution, route = route).apply {
            id = 700
            returnItems = listOf(
                FoodCollectionReturnItemEntity(shop = billaShop, description = "Graue Kisten", amount = 4),
                FoodCollectionReturnItemEntity(shop = billaShop, description = "Bananenkartons", amount = 2),
                FoodCollectionReturnItemEntity(shop = dennsShop, description = "Ströck Kisten", amount = 0),
                FoodCollectionReturnItemEntity(shop = retiredShop, description = "Klappkisten schwarz", amount = 5),
            )
        }

        every {
            foodCollectionRepository.findFirstByRouteIdAndDistributionIdNotOrderByDistributionStartedAtDescIdDesc(any(), any())
        } returns collection
    }

    private fun guidanceTestRoute(): RouteEntity {
        val billaShop = ShopEntity(
            number = 12,
            name = "Billa Mitte",
            address = ShopAddress(street = "Hauptstrasse 5", postalCode = 1010, city = "Wien"),
        ).apply {
            id = 12
            phone = "01 234567"
            contactPerson = "Frau Huber"
            note = "Klingeln bei der Rampe"
        }
        val dennsShop = ShopEntity(
            number = 13,
            name = "Denns Bio",
            address = ShopAddress(street = "Nebengasse 2", postalCode = 1020, city = "Wien"),
            foodUnit = FoodUnit.KG,
        ).apply { id = 13 }

        return RouteEntity(number = 1.0, name = "Route 1").apply {
            id = 1
            note = "Note 1"
            stops = mutableListOf(
                RouteStopEntity(route = this, time = LocalTime.of(10, 0)).apply {
                    id = 33
                    shop = dennsShop
                },
                RouteStopEntity(route = this, time = LocalTime.of(8, 0)).apply {
                    id = 11
                    shop = billaShop
                },
                RouteStopEntity(route = this, time = LocalTime.of(9, 0)).apply {
                    id = 22
                    description = "Pause"
                },
            )
        }
    }
}
