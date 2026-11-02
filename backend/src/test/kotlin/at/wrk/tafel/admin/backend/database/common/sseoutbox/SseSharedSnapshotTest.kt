package at.wrk.tafel.admin.backend.database.common.sseoutbox

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executor
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger

internal class SseSharedSnapshotTest {

    private val synchronous = Executor { it.run() }

    @Test
    fun `one computation per change is handed to every subscriber`() {
        val computations = AtomicInteger()
        val snapshot = SseSharedSnapshot("test", synchronous) { computations.incrementAndGet() }
        val received = List(3) { CopyOnWriteArrayList<Int>() }
        received.forEach { list -> snapshot.subscribe { list.add(it) } }

        snapshot.changed()

        assertThat(computations.get()).isEqualTo(1)
        received.forEach { assertThat(it).containsExactly(1) }
    }

    @Test
    fun `nothing is computed while nobody is subscribed`() {
        val computations = AtomicInteger()
        val snapshot = SseSharedSnapshot("test", synchronous) { computations.incrementAndGet() }
        val subscriber: (Int) -> Unit = {}
        snapshot.subscribe(subscriber)
        snapshot.unsubscribe(subscriber)

        snapshot.changed()

        assertThat(computations.get()).isZero()
    }

    @Test
    fun `changes during a computation are merged into one more computation`() {
        val computing = CountDownLatch(1)
        val release = CountDownLatch(1)
        val computations = AtomicInteger()
        val snapshot = SseSharedSnapshot("test", SseDeliveryExecutor()) {
            val run = computations.incrementAndGet()
            if (run == 1) {
                computing.countDown()
                release.await()
            }
            run
        }
        val received = CopyOnWriteArrayList<Int>()
        snapshot.subscribe { received.add(it) }

        snapshot.changed()
        assertThat(computing.await(5, TimeUnit.SECONDS)).isTrue()
        repeat(5) { snapshot.changed() }
        release.countDown()

        awaitUntil { received.size == 2 }
        Thread.sleep(100)
        assertThat(computations.get()).isEqualTo(2)
        assertThat(received).containsExactly(1, 2)
    }

    @Test
    fun `a failed computation leaves the next change working`() {
        var fail = true
        val snapshot = SseSharedSnapshot("test", synchronous) { if (fail) error("database gone") else 42 }
        val received = CopyOnWriteArrayList<Int>()
        snapshot.subscribe { received.add(it) }

        snapshot.changed()
        fail = false
        snapshot.changed()

        assertThat(received).containsExactly(42)
    }

    @Test
    fun `a failing subscriber does not keep the value from the others`() {
        val snapshot = SseSharedSnapshot("test", synchronous) { 1 }
        val received = CopyOnWriteArrayList<Int>()
        snapshot.subscribe { error("stream gone") }
        snapshot.subscribe { received.add(it) }

        snapshot.changed()

        assertThat(received).containsExactly(1)
    }

    private fun awaitUntil(condition: () -> Boolean) {
        val deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5)
        while (!condition()) {
            check(System.nanoTime() < deadline) { "condition not met within 5s" }
            Thread.sleep(10)
        }
    }
}
