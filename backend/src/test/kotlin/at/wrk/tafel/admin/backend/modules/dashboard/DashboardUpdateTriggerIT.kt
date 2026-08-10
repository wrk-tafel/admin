package at.wrk.tafel.admin.backend.modules.dashboard

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.database.model.logistics.RouteEntity
import at.wrk.tafel.admin.backend.database.model.logistics.RouteRepository
import at.wrk.tafel.admin.backend.database.model.logistics.RouteStopCompletionEntity
import at.wrk.tafel.admin.backend.database.model.logistics.RouteStopCompletionRepository
import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxListenerService
import at.wrk.tafel.admin.backend.database.model.logistics.RouteStopEntity
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.transaction.support.TransactionTemplate
import java.time.LocalDate
import java.time.LocalTime
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/**
 * The dashboard refreshes itself from `sse_outbox` rows that nothing in the application writes -
 * they are inserted by database triggers on the tables the dashboard reads (see the module README
 * and `R__00059` / `R__00097`). A panel whose source table has no trigger renders once and then goes
 * quietly stale, which no unit test can see: the service returns the right numbers either way, and
 * only a real database says whether anybody is told to ask again.
 *
 * Route progress is the panel that has to follow a driver ticking stops off out on the road, so it
 * is the one asserted here.
 */
class DashboardUpdateTriggerIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var transactionTemplate: TransactionTemplate

    @Autowired
    private lateinit var routeRepository: RouteRepository

    @Autowired
    private lateinit var routeStopCompletionRepository: RouteStopCompletionRepository

    @Autowired
    private lateinit var jdbcTemplate: JdbcTemplate

    @Autowired
    private lateinit var sseOutboxListenerService: SseOutboxListenerService

    private var routeId: Long = 0

    @AfterEach
    fun afterEach() {
        transactionTemplate.executeWithoutResult {
            routeRepository.findById(routeId).ifPresent { routeRepository.delete(it) }
            jdbcTemplate.update("delete from sse_outbox where notification_name = 'dashboard_update'")
        }
    }

    @Test
    fun `ticking a route stop off notifies the dashboard`() {
        routeId = transactionTemplate.execute {
            val route = RouteEntity(number = 93.5, name = "IT Dashboard Trigger Route").apply {
                stops = mutableListOf(RouteStopEntity(route = this, time = LocalTime.of(9, 0)))
            }
            routeRepository.saveAndFlush(route).id!!
        }!!
        val stopId = transactionTemplate.execute { routeRepository.findById(routeId).get().stops.first().id!! }!!

        // The route itself is not one of the trigger's tables, so anything left over from creating it
        // would be a false positive.
        transactionTemplate.executeWithoutResult {
            jdbcTemplate.update("delete from sse_outbox where notification_name = 'dashboard_update'")
        }

        transactionTemplate.executeWithoutResult {
            val stop = routeRepository.findById(routeId).get().stops.first()
            routeStopCompletionRepository.saveAndFlush(
                RouteStopCompletionEntity(routeStop = stop, completionDate = LocalDate.now()),
            )
        }

        assertThat(dashboardNotifications())
            .describedAs("dashboard_update rows in sse_outbox after a stop was ticked off")
            .isPositive()

        // ...and taking it back off again, which is the other half of what a driver can do.
        transactionTemplate.executeWithoutResult {
            jdbcTemplate.update("delete from sse_outbox where notification_name = 'dashboard_update'")
            routeStopCompletionRepository.deleteByRouteStopIdAndCompletionDate(stopId, LocalDate.now())
        }

        assertThat(dashboardNotifications())
            .describedAs("dashboard_update rows in sse_outbox after a stop was un-ticked")
            .isPositive()
    }

    /**
     * The row is only half of it: the dashboard refreshes because `sse_outbox`'s own `pg_notify`
     * trigger wakes [SseOutboxListenerService], which is what the SSE stream hangs off. This asserts
     * that whole path in one go - a stop ticked off out on the road reaches a listener - because
     * every link in it lives somewhere else (two migrations, a LISTEN connection, a callback
     * registry) and none of them fails loudly when it is the one that is missing.
     */
    @Test
    fun `ticking a route stop off reaches a listener on the dashboard notification`() {
        routeId = transactionTemplate.execute {
            val route = RouteEntity(number = 93.6, name = "IT Dashboard Notify Route").apply {
                stops = mutableListOf(RouteStopEntity(route = this, time = LocalTime.of(9, 0)))
            }
            routeRepository.saveAndFlush(route).id!!
        }!!

        val notified = CountDownLatch(1)
        val callback: (String?) -> Unit = { notified.countDown() }
        sseOutboxListenerService.registerCallback(
            DashboardController.DASHBOARD_UPDATE_NOTIFICATION_NAME,
            callback,
        )

        try {
            transactionTemplate.executeWithoutResult {
                val stop = routeRepository.findById(routeId).get().stops.first()
                routeStopCompletionRepository.saveAndFlush(
                    RouteStopCompletionEntity(routeStop = stop, completionDate = LocalDate.now()),
                )
            }

            assertThat(notified.await(10, TimeUnit.SECONDS))
                .describedAs("a dashboard_update notification reached the listener")
                .isTrue()
        } finally {
            sseOutboxListenerService.unregisterCallback(
                DashboardController.DASHBOARD_UPDATE_NOTIFICATION_NAME,
                callback,
            )
        }
    }

    private fun dashboardNotifications(): Int = jdbcTemplate.queryForObject(
        "select count(*) from sse_outbox where notification_name = 'dashboard_update'",
        Int::class.java,
    )!!
}
