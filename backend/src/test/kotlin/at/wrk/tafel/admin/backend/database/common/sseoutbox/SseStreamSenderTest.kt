package at.wrk.tafel.admin.backend.database.common.sseoutbox

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executor
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger

internal class SseStreamSenderTest {

    private val written = CopyOnWriteArrayList<String>()
    private val completions = AtomicInteger()
    private val overflows = AtomicInteger()

    private fun sender(executor: Executor = Executor { it.run() }, write: (SseEmitter.SseEventBuilder) -> Unit = { written.add(it.comment()) }) = SseStreamSender(
        executor = executor,
        write = write,
        completeStream = { completions.incrementAndGet() },
        onOverflow = { overflows.incrementAndGet() },
    )

    private fun SseEmitter.SseEventBuilder.comment(): String = build().joinToString("") { it.data.toString() }.trimEnd() + "\n"

    private fun event(name: String) = SseEmitter.event().comment(name)

    @Test
    fun `events are written in the order they were sent`() {
        val sender = sender()

        sender.send(event("a"))
        sender.send(event("b"))

        assertThat(written).containsExactly(":a\n", ":b\n")
    }

    @Test
    fun `nothing is written after complete`() {
        val sender = sender()

        sender.send(event("a"))
        sender.complete()
        sender.send(event("b"))
        sender.complete()

        assertThat(written).containsExactly(":a\n")
        assertThat(completions.get()).isEqualTo(1)
    }

    @Test
    fun `nothing is written after close`() {
        val sender = sender()

        sender.close()
        sender.send(event("a"))
        sender.complete()

        assertThat(written).isEmpty()
        assertThat(completions.get()).isZero()
    }

    @Test
    fun `send does not wait for a write that blocks`() {
        val release = CountDownLatch(1)
        val firstWriteStarted = CountDownLatch(1)
        val sender = sender(executor = SseDeliveryExecutor()) {
            firstWriteStarted.countDown()
            release.await()
            written.add(it.comment())
        }

        try {
            sender.send(event("a"))
            assertThat(firstWriteStarted.await(5, TimeUnit.SECONDS)).isTrue()

            // returns at once although the write before it is still blocked
            sender.send(event("b"))
            assertThat(written).isEmpty()
        } finally {
            release.countDown()
        }
        awaitUntil { written.size == 2 }
        assertThat(written).containsExactly(":a\n", ":b\n")
    }

    @Test
    fun `a stream that falls too far behind is completed and its backlog dropped`() {
        val release = CountDownLatch(1)
        val firstWriteStarted = CountDownLatch(1)
        val sender = sender(executor = SseDeliveryExecutor()) {
            firstWriteStarted.countDown()
            release.await()
            written.add(it.comment())
        }

        sender.send(event("blocked"))
        assertThat(firstWriteStarted.await(5, TimeUnit.SECONDS)).isTrue()
        repeat(SseStreamSender.MAX_PENDING_EVENTS + 1) { sender.send(event("queued-$it")) }
        sender.send(event("after the overflow"))
        release.countDown()

        awaitUntil { completions.get() == 1 }
        assertThat(overflows.get()).isEqualTo(1)
        assertThat(written).containsExactly(":blocked\n")
    }

    private fun awaitUntil(condition: () -> Boolean) {
        val deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5)
        while (!condition()) {
            check(System.nanoTime() < deadline) { "condition not met within 5s" }
            Thread.sleep(10)
        }
    }
}
