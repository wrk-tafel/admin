package at.wrk.tafel.admin.backend.database.common.sseoutbox

import org.springframework.web.servlet.mvc.method.annotation.SseEmitter
import java.util.concurrent.Executor
import java.util.concurrent.locks.ReentrantLock
import kotlin.concurrent.withLock

/**
 * The one way anything is written to a stream: a bounded queue per stream, drained in order on the
 * [SseDeliveryExecutor], so whoever has something to send only ever enqueues and never waits for the
 * socket.
 *
 * Writing to an `SseEmitter` is a blocking socket write. A client that stops reading without closing
 * its connection (a phone that lost its network, a laptop gone to sleep, a NAT that forgot the
 * connection) fills the send buffer, and from then on every write to it blocks until the container's
 * write timeout. Done on the outbox listener's coroutine, as it used to be, that held back every
 * event for every stream for as long as it lasted (issue #3942). Now it holds back that one stream:
 * its drain blocks, its queue fills, and the others carry on.
 *
 * A stream that falls [MAX_PENDING_EVENTS] behind is given up on: what is queued is dropped,
 * nothing more is accepted, and the stream is completed once the blocked write returns or fails.
 * Its browser, if it is still there, reconnects and starts from the current state - every topic
 * sends that on subscribe - which is worth more than a backlog of superseded events.
 */
internal class SseStreamSender(
    private val executor: Executor,
    private val write: (SseEmitter.SseEventBuilder) -> Unit,
    private val completeStream: () -> Unit,
    private val onOverflow: () -> Unit,
) {
    companion object {
        /**
         * Far more than a reading client ever has queued - a stream gets a heartbeat every 25 seconds
         * and an event per change of what its screen shows - and few enough that a stream nobody reads
         * is let go of within minutes on a distribution day.
         */
        const val MAX_PENDING_EVENTS = 100
    }

    private sealed interface Pending
    private class Send(val event: SseEmitter.SseEventBuilder) : Pending
    private data object Complete : Pending

    private val lock = ReentrantLock()
    private val pending = ArrayDeque<Pending>()
    private var draining = false
    private var closed = false

    fun send(event: SseEmitter.SseEventBuilder) = offer(Send(event))

    /** Completes the stream after what is already queued has been written. */
    fun complete() = offer(Complete)

    /** The stream has ended: drops what is queued and accepts nothing more. */
    fun close() {
        lock.withLock {
            closed = true
            pending.clear()
        }
    }

    private fun offer(item: Pending) {
        var overflowed = false
        val startDrain = lock.withLock {
            if (closed) {
                return
            }
            if (item is Send && pending.size >= MAX_PENDING_EVENTS) {
                overflowed = true
                pending.clear()
                pending.add(Complete)
            } else {
                pending.add(item)
            }
            closed = pending.last() == Complete
            !draining.also { draining = true }
        }

        if (overflowed) {
            onOverflow()
        }
        if (startDrain) {
            executor.execute(::drain)
        }
    }

    private fun drain() {
        while (true) {
            val next = lock.withLock {
                pending.removeFirstOrNull().also { if (it == null) draining = false }
            } ?: return

            when (next) {
                is Send -> write(next.event)
                Complete -> completeStream()
            }
        }
    }
}
