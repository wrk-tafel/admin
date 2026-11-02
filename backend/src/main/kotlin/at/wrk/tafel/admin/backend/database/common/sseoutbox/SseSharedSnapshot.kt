package at.wrk.tafel.admin.backend.database.common.sseoutbox

import org.slf4j.LoggerFactory
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.Executor
import java.util.concurrent.atomic.AtomicReference

/**
 * A value that is read fresh from the database whenever a notification says it changed, and that is
 * the same for every stream subscribed to it - the dashboard, the header's registration count. Made
 * with [SseOutboxService.sharedSnapshot], subscribed to with [SseOutboxService.listenForSharedSnapshot].
 *
 * Computed once per change and handed to every subscriber, rather than once per subscriber: with a
 * callback per stream, one change with N dashboards open ran the same queries N times, one after the
 * other on the outbox listener's coroutine (issue #3943). It runs on the [SseDeliveryExecutor], so the
 * listener is never waiting for the database either.
 *
 * Changes that arrive while a computation is running are merged into one more computation after it,
 * however many there were - each computation reads the current state, so the one that starts after
 * the last change covers all of them, and a burst of changes costs two computations, not one per
 * change.
 */
class SseSharedSnapshot<T> internal constructor(
    private val notificationName: String,
    private val executor: Executor,
    private val compute: () -> T,
) {
    companion object {
        private val logger = LoggerFactory.getLogger(SseSharedSnapshot::class.java)
    }

    private enum class State { IDLE, RUNNING, RUNNING_AND_CHANGED }

    private val state = AtomicReference(State.IDLE)
    private val subscribers = CopyOnWriteArrayList<(T) -> Unit>()

    internal fun subscribe(subscriber: (T) -> Unit) {
        subscribers.add(subscriber)
    }

    internal fun unsubscribe(subscriber: (T) -> Unit) {
        subscribers.remove(subscriber)
    }

    /** Called for each notification - starts a computation, or asks the running one for another. */
    internal fun changed() {
        if (subscribers.isEmpty()) {
            return
        }
        while (true) {
            when (state.get()) {
                State.IDLE -> if (state.compareAndSet(State.IDLE, State.RUNNING)) {
                    executor.execute(::computeAndDeliver)
                    return
                }
                State.RUNNING -> if (state.compareAndSet(State.RUNNING, State.RUNNING_AND_CHANGED)) {
                    return
                }
                State.RUNNING_AND_CHANGED -> return
            }
        }
    }

    private fun computeAndDeliver() {
        do {
            state.set(State.RUNNING)
            runCatching(compute)
                .onSuccess(::deliver)
                .onFailure { logger.error("Failed to compute the '{}' snapshot for its SSE streams", notificationName, it) }
        } while (!state.compareAndSet(State.RUNNING, State.IDLE))
    }

    private fun deliver(value: T) {
        subscribers.forEach { subscriber ->
            runCatching { subscriber(value) }
                .onFailure { logger.debug("Delivering the '{}' snapshot to a subscriber failed: {}", notificationName, it.message) }
        }
    }
}
