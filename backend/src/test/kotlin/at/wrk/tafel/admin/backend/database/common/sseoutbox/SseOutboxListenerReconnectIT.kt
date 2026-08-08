package at.wrk.tafel.admin.backend.database.common.sseoutbox

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import org.assertj.core.api.Assertions.assertThat
import org.awaitility.Awaitility.await
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.jdbc.core.JdbcTemplate
import java.time.Duration
import java.util.concurrent.CopyOnWriteArrayList

/**
 * Proves that losing the dedicated `LISTEN sse_outbox` connection is survivable, against a real
 * Postgres killing it the way a restart or a failover would.
 *
 * Without [SseOutboxListenerService]'s reconnect this is the failure that takes server push down
 * application-wide and leaves nothing to see: browsers keep their `EventSource` open and just never
 * receive another event again, until the container is restarted.
 */
internal class SseOutboxListenerReconnectIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var sseOutboxListenerService: SseOutboxListenerService

    @Autowired
    private lateinit var sseOutboxService: SseOutboxService

    @Autowired
    private lateinit var jdbcTemplate: JdbcTemplate

    private val receivedPayloads = CopyOnWriteArrayList<String?>()
    private val callback: (String?) -> Unit = { receivedPayloads.add(it) }

    @BeforeEach
    fun beforeEach() {
        sseOutboxListenerService.registerCallback(NOTIFICATION_NAME, callback)
    }

    @AfterEach
    fun afterEach() {
        sseOutboxListenerService.unregisterCallback(NOTIFICATION_NAME, callback)
    }

    @Test
    fun `keeps delivering notifications after the listening connection is terminated`() {
        publish("before-termination")
        awaitPayloadReceived("before-termination")

        assertThat(terminateListeningConnection()).isPositive()

        // Written while the listener is down, so its `pg_notify` reaches nobody - Postgres drops
        // what a terminated session was listening for instead of queueing it. It arrives only
        // because the reconnect replays the outbox rows written since the connection was last alive.
        publish("while-disconnected")
        awaitPayloadReceived("while-disconnected")

        // And the new connection is a fully working one, not just a successful replay.
        publish("after-reconnect")
        awaitPayloadReceived("after-reconnect")
    }

    private fun publish(value: String) = sseOutboxService.saveOutboxEntry(NOTIFICATION_NAME, mapOf("value" to value))

    private fun awaitPayloadReceived(value: String) = await().atMost(Duration.ofSeconds(30)).untilAsserted {
        assertThat(receivedPayloads).anyMatch { it != null && it.contains(value) }
    }

    private fun terminateListeningConnection(): Int = jdbcTemplate.queryForObject(
        """
        select count(pg_terminate_backend(pid))
        from pg_stat_activity
        where application_name = ? and pid <> pg_backend_pid()
        """.trimIndent(),
        Int::class.java,
        SseOutboxListenerService.CONNECTION_APPLICATION_NAME,
    )!!

    companion object {
        private const val NOTIFICATION_NAME = "sse_outbox_listener_reconnect_it"
    }
}
