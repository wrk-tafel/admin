package at.wrk.tafel.admin.backend.modules.logistics.internal

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.common.test.TestdataGenerator.createUser
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.logistics.RouteEntity
import at.wrk.tafel.admin.backend.database.model.logistics.RouteRepository
import at.wrk.tafel.admin.backend.database.model.logistics.RouteStopCompletionRepository
import at.wrk.tafel.admin.backend.database.model.logistics.RouteStopEntity
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.core.context.SecurityContextImpl
import org.springframework.transaction.support.TransactionTemplate
import java.time.LocalDate
import java.time.LocalTime
import java.util.concurrent.CyclicBarrier
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

/**
 * Covers issue #3560: `setCompletion`'s find-then-insert against
 * `(route_stop_id, completion_date)`'s `UNIQUE` constraint is a race the driver-guidance screen
 * explicitly invites - it's designed for two people (driver and co-driver) on one van both ticking
 * the same stop. Serialized by `AdvisoryLockKey.ROUTE_STOP_COMPLETION`, so every concurrent call now
 * succeeds idempotently instead of the loser getting a duplicate-key 500. Same shape as
 * [at.wrk.tafel.admin.backend.modules.distribution.internal.DistributionConcurrentCreateIT].
 */
class RouteGuidanceConcurrentCompletionIT : TafelBaseIntegrationTest() {

    private companion object {
        const val PARALLEL_REQUESTS = 10
    }

    @Autowired
    private lateinit var transactionTemplate: TransactionTemplate

    @Autowired
    private lateinit var routeGuidanceService: RouteGuidanceService

    @Autowired
    private lateinit var routeRepository: RouteRepository

    @Autowired
    private lateinit var routeStopCompletionRepository: RouteStopCompletionRepository

    @Autowired
    private lateinit var userRepository: UserRepository

    private lateinit var testUser: UserEntity
    private var routeId: Long = 0
    private var stopId: Long = 0

    @BeforeEach
    fun beforeEach() {
        testUser = transactionTemplate.execute { userRepository.saveAndFlush(createUser()) }!!

        val route = transactionTemplate.execute {
            routeRepository.saveAndFlush(
                RouteEntity(number = 999.0, name = "Concurrent completion IT route").apply {
                    stops = mutableListOf(RouteStopEntity(route = this, time = LocalTime.of(8, 0)).apply { description = "Stop" })
                },
            )
        }!!
        routeId = route.id!!
        stopId = route.stops.first().id!!
    }

    @AfterEach
    fun afterEach() {
        transactionTemplate.executeWithoutResult {
            routeStopCompletionRepository.deleteAll(
                routeStopCompletionRepository.findAllByRouteStopIdInAndCompletionDate(listOf(stopId), LocalDate.now()),
            )
            routeRepository.findById(routeId).ifPresent { routeRepository.delete(it) }
            userRepository.deleteById(testUser.id!!)
        }
    }

    @Test
    fun `concurrent completions of the same stop never fail and leave a single row`() {
        val barrier = CyclicBarrier(PARALLEL_REQUESTS)
        val executor = Executors.newFixedThreadPool(PARALLEL_REQUESTS)
        try {
            val futures = (1..PARALLEL_REQUESTS).map {
                executor.submit<Result<Unit>> {
                    SecurityContextHolder.setContext(
                        SecurityContextImpl(TafelJwtAuthentication(tokenValue = "TOKEN", username = testUser.username)),
                    )
                    try {
                        barrier.await(10, TimeUnit.SECONDS)
                        routeGuidanceService.setCompletion(routeId, stopId, true)
                        Result.success(Unit)
                    } finally {
                        SecurityContextHolder.clearContext()
                    }
                }
            }

            val results = futures.map { it.get(10, TimeUnit.SECONDS) }

            assertThat(results.count { it.isSuccess }).isEqualTo(PARALLEL_REQUESTS)

            val storedCompletions = transactionTemplate.execute {
                routeStopCompletionRepository.findAllByRouteStopIdInAndCompletionDate(listOf(stopId), LocalDate.now())
            }!!
            assertThat(storedCompletions).hasSize(1)
        } finally {
            executor.shutdownNow()
        }
    }
}
