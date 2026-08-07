package at.wrk.tafel.admin.backend.config.properties

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxListenerService
import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxService
import org.assertj.core.api.Assertions.assertThat
import org.awaitility.Awaitility.await
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.cloud.context.refresh.ContextRefresher
import java.time.Duration
import java.util.concurrent.atomic.AtomicReference
import javax.sql.DataSource

/**
 * Guards what a config reload must *not* disturb.
 *
 * A refresh recomputes the environment of a running application, and Spring Cloud can be told to
 * destroy and re-create beans along with it (`spring.cloud.refresh.extra-refreshable`, plus anything
 * annotated `@RefreshScope`). Nothing here opts into that, and the point of this test is that it
 * stays that way - two things in particular would be badly damaged by it:
 *
 * - the Hikari connection pool, which earlier Spring Cloud versions re-created on every refresh by
 *   default. Tearing it down mid-request closes connections other threads are using.
 * - `SseOutboxListenerService`, which holds one dedicated `LISTEN sse_outbox` connection opened in
 *   `@PostConstruct` and reads it from a coroutine that blocks indefinitely. Re-creating that bean
 *   would close the connection under the blocked reader - the failure mode behind issue #2985 - and
 *   every open SSE stream in the app would go quiet without anything looking broken.
 *
 * Its `spring.datasource.*` values come from `@Value` constructor parameters, which are resolved
 * once when the bean is built and are *not* re-resolved by a refresh. That is the intended
 * behaviour, not an oversight: changing the database a running application talks to is a restart.
 */
internal class ConfigRefreshSideEffectsIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var contextRefresher: ContextRefresher

    @Autowired
    private lateinit var dataSource: DataSource

    @Autowired
    private lateinit var sseOutboxListenerService: SseOutboxListenerService

    @Autowired
    private lateinit var sseOutboxService: SseOutboxService

    @Test
    fun `a refresh leaves the connection pool and the outbox listener untouched`() {
        val dataSourceBeforeRefresh = dataSource
        val listenerJobBeforeRefresh = sseOutboxListenerService.notificationListenerJob
        val received = AtomicReference<String?>()
        sseOutboxListenerService.callbacks
            .computeIfAbsent(NOTIFICATION_NAME) { java.util.concurrent.CopyOnWriteArrayList() }
            .add { payload -> received.set(payload) }

        contextRefresher.refresh()

        assertThat(dataSource).isSameAs(dataSourceBeforeRefresh)
        assertThat(sseOutboxListenerService.notificationListenerJob).isSameAs(listenerJobBeforeRefresh)
        assertThat(listenerJobBeforeRefresh.isActive).isTrue()

        // The identity checks alone can't tell a live LISTEN connection from a closed one, so the
        // real proof is that a notification still arrives after the refresh.
        sseOutboxService.saveOutboxEntry(NOTIFICATION_NAME, mapOf("value" to "after-refresh"))

        await().atMost(Duration.ofSeconds(10)).untilAsserted {
            assertThat(received.get()).contains("after-refresh")
        }
    }

    companion object {
        private const val NOTIFICATION_NAME = "config_refresh_side_effects_it"
    }
}
