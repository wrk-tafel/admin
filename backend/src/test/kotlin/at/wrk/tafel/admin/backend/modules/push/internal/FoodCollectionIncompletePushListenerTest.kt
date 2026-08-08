package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCollectionEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodCollectionItemEntity
import at.wrk.tafel.admin.backend.database.model.logistics.RouteEntity
import at.wrk.tafel.admin.backend.database.model.logistics.RouteRepository
import at.wrk.tafel.admin.backend.database.model.push.PushNotificationType
import at.wrk.tafel.admin.backend.modules.base.employee.testEmployee1
import at.wrk.tafel.admin.backend.modules.base.employee.testEmployee2
import at.wrk.tafel.admin.backend.modules.distribution.DistributionClosedEvent
import at.wrk.tafel.admin.backend.modules.logistics.testCar1
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCategory1
import at.wrk.tafel.admin.backend.modules.logistics.testShop1
import at.wrk.tafel.admin.backend.security.testUserEntity
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.data.repository.findByIdOrNull
import org.springframework.scheduling.annotation.Async
import java.time.LocalDateTime

@ExtendWith(MockKExtension::class)
internal class FoodCollectionIncompletePushListenerTest {

    @RelaxedMockK
    private lateinit var distributionRepository: DistributionRepository

    @RelaxedMockK
    private lateinit var routeRepository: RouteRepository

    @RelaxedMockK
    private lateinit var pushBroadcastService: PushBroadcastService

    @InjectMockKs
    private lateinit var listener: FoodCollectionIncompletePushListener

    private val distributionId = 123L

    private fun routeOf(id: Long, number: Double, name: String) = RouteEntity(number = number, name = name).apply {
        this.id = id
        enabled = true
    }

    private fun distributionWith(vararg foodCollections: FoodCollectionEntity): DistributionEntity = DistributionEntity(startedAt = LocalDateTime.parse("2024-03-02T13:30:00"), startedByUser = testUserEntity).apply {
        id = distributionId
        this.foodCollections = foodCollections.toList()
    }

    private fun fullyRecordedCollectionFor(route: RouteEntity, distribution: DistributionEntity? = null) = FoodCollectionEntity(
        distribution = distribution ?: DistributionEntity(startedAt = LocalDateTime.now(), startedByUser = testUserEntity),
        route = route,
    ).apply {
        car = testCar1
        driver = testEmployee1
        coDriver = testEmployee2
        kmStart = 100
        kmEnd = 200
        items = listOf(FoodCollectionItemEntity(category = testFoodCategory1, shop = testShop1, amount = 5))
    }

    private fun partiallyRecordedCollectionFor(route: RouteEntity) = fullyRecordedCollectionFor(route).apply { items = emptyList() }

    @Test
    fun `notifies about the routes whose food collection was never fully recorded`() {
        val recorded = routeOf(id = 1, number = 1.0, name = "Route 1")
        val missing = routeOf(id = 2, number = 2.0, name = "Route 2")
        val distribution = distributionWith(fullyRecordedCollectionFor(recorded))

        every { distributionRepository.findByIdOrNull(distributionId) } returns distribution
        every { routeRepository.findByEnabledIsTrue() } returns listOf(recorded, missing)

        listener.onDistributionClosed(DistributionClosedEvent(distributionId))

        verify {
            pushBroadcastService.broadcast(
                type = PushNotificationType.FOOD_COLLECTION_INCOMPLETE,
                title = "Warenerfassung unvollständig",
                body = "Bei der Ausgabe vom 02.03.2024 fehlt die Warenerfassung für: Route 2.",
            )
        }
    }

    /**
     * A row exists as soon as any part of a route's trip is entered, so "has a food collection" is
     * not the same question as "was recorded" - counting rows would report a half-entered route as
     * done, which is exactly the case this notification exists to catch.
     */
    @Test
    fun `counts a partially recorded route as missing`() {
        val partial = routeOf(id = 1, number = 1.0, name = "Route 1")
        val distribution = distributionWith(partiallyRecordedCollectionFor(partial))

        every { distributionRepository.findByIdOrNull(distributionId) } returns distribution
        every { routeRepository.findByEnabledIsTrue() } returns listOf(partial)

        listener.onDistributionClosed(DistributionClosedEvent(distributionId))

        verify {
            pushBroadcastService.broadcast(
                type = PushNotificationType.FOOD_COLLECTION_INCOMPLETE,
                title = any(),
                body = "Bei der Ausgabe vom 02.03.2024 fehlt die Warenerfassung für: Route 1.",
            )
        }
    }

    @Test
    fun `lists several missing routes ordered by route number`() {
        val first = routeOf(id = 1, number = 1.0, name = "Route Eins")
        val second = routeOf(id = 2, number = 2.0, name = "Route Zwei")
        val distribution = distributionWith()

        every { distributionRepository.findByIdOrNull(distributionId) } returns distribution
        every { routeRepository.findByEnabledIsTrue() } returns listOf(second, first)

        listener.onDistributionClosed(DistributionClosedEvent(distributionId))

        verify {
            pushBroadcastService.broadcast(
                type = PushNotificationType.FOOD_COLLECTION_INCOMPLETE,
                title = any(),
                body = "Bei der Ausgabe vom 02.03.2024 fehlt die Warenerfassung für: Route Eins, Route Zwei.",
            )
        }
    }

    @Test
    fun `stays quiet when every enabled route was fully recorded`() {
        val route = routeOf(id = 1, number = 1.0, name = "Route 1")
        val distribution = distributionWith(fullyRecordedCollectionFor(route))

        every { distributionRepository.findByIdOrNull(distributionId) } returns distribution
        every { routeRepository.findByEnabledIsTrue() } returns listOf(route)

        listener.onDistributionClosed(DistributionClosedEvent(distributionId))

        verify(exactly = 0) { pushBroadcastService.broadcast(any(), any(), any()) }
    }

    /**
     * A disabled route isn't driven anymore, so no recording is expected for it - counting it as
     * missing would make this notification fire after every single distribution.
     */
    @Test
    fun `ignores routes that are disabled`() {
        val disabled = routeOf(id = 2, number = 2.0, name = "Route 2").apply { enabled = false }
        val distribution = distributionWith()

        every { distributionRepository.findByIdOrNull(distributionId) } returns distribution
        every { routeRepository.findByEnabledIsTrue() } returns emptyList()

        listener.onDistributionClosed(DistributionClosedEvent(distributionId))

        assertThat(disabled.enabled).isFalse()
        verify(exactly = 0) { pushBroadcastService.broadcast(any(), any(), any()) }
    }

    @Test
    fun `unknown distribution id is a no-op`() {
        every { distributionRepository.findByIdOrNull(any()) } returns null

        listener.onDistributionClosed(DistributionClosedEvent(999L))

        verify(exactly = 0) { pushBroadcastService.broadcast(any(), any(), any()) }
    }

    /**
     * This event is also published straight from a request thread by the manual mail resend, so the
     * per-device HTTPS sends must not run on the publishing thread.
     */
    @Test
    fun `broadcast runs off the publishing thread`() {
        val method = FoodCollectionIncompletePushListener::class.java
            .getDeclaredMethod("onDistributionClosed", DistributionClosedEvent::class.java)

        assertThat(method.isAnnotationPresent(Async::class.java)).isTrue()
    }
}
