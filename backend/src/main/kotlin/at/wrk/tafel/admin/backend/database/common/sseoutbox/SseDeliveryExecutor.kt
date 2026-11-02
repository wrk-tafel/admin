package at.wrk.tafel.admin.backend.database.common.sseoutbox

import org.springframework.beans.factory.annotation.Autowired
import org.springframework.stereotype.Component
import java.util.concurrent.Executor
import java.util.concurrent.Executors

/**
 * Runs what server push does besides waiting for notifications: writing to the streams
 * ([SseStreamSender]) and computing the snapshots several streams share ([SseSharedSnapshot]).
 *
 * One virtual thread per task. A write to a stream whose client stopped reading blocks in the
 * container until its write timeout, and with platform threads a handful of such clients would use
 * up any pool of a size worth having; a blocked virtual thread costs next to nothing. That is also
 * why this is its own executor rather than Spring's `applicationTaskExecutor`.
 */
@Component
class SseDeliveryExecutor internal constructor(private val delegate: Executor) : Executor {

    @Autowired
    constructor() : this(Executors.newThreadPerTaskExecutor(Thread.ofVirtual().name("sse-delivery-", 0).factory()))

    override fun execute(command: Runnable) = delegate.execute(command)
}
