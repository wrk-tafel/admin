package at.wrk.tafel.admin.backend.config

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.modules.household.internal.document.DocumentStorageCleanupService
import net.javacrumbs.shedlock.core.LockConfiguration
import net.javacrumbs.shedlock.core.LockingTaskExecutor
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Timeout
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.jdbc.core.JdbcTemplate
import java.time.Duration
import java.time.Instant
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger

/**
 * That the once-per-cluster jobs really are once per cluster, against a real database.
 *
 * Everything here is infrastructure that fails silently when it is wrong: `@SchedulerLock` does
 * nothing at all if the advice was never enabled, and the `shedlock` table's shape is ShedLock's
 * rather than this application's - a column named differently in `R__00100_shedlock.sql` surfaces
 * the first time a job runs in production, and nowhere earlier. A unit test sees none of it, because
 * the lock lives in the proxy and the table.
 */
class SchedulerLockIT : TafelBaseIntegrationTest() {

    private companion object {
        const val CLEANUP_LOCK = "documentStorageCleanup"
        const val TEST_LOCK = "schedulerLockItTestJob"
    }

    @Autowired
    private lateinit var documentStorageCleanupService: DocumentStorageCleanupService

    @Autowired
    private lateinit var lockingTaskExecutor: LockingTaskExecutor

    @Autowired
    private lateinit var jdbcTemplate: JdbcTemplate

    /** Each test's lock is left held for an hour by design, so nothing here may inherit one. */
    @BeforeEach
    fun releaseLocksUnderTest() {
        jdbcTemplate.update("DELETE FROM shedlock WHERE name = ? OR name LIKE ?", CLEANUP_LOCK, "$TEST_LOCK%")
    }

    /**
     * The annotation is wired and names the lock it says it does. Asserted on the row rather than on
     * the job's effect because the lock is taken by the advice, before the method body runs at all -
     * which is exactly what makes this a check of the wiring and not of the cleanup.
     */
    @Test
    fun `an annotated job takes its named lock`() {
        documentStorageCleanupService.cleanupOrphanedFiles()

        val lock = jdbcTemplate.queryForMap("SELECT * FROM shedlock WHERE name = ?", CLEANUP_LOCK)
        assertThat(lock["locked_by"]).asString().isNotBlank()
        assertThat(lock["lock_until"] as java.sql.Timestamp)
            .describedAs("held for lockAtLeastFor after the run, so a second instance's tick finds it taken")
            .isAfter(lock["locked_at"] as java.sql.Timestamp)
    }

    /**
     * What the daily jobs actually need. Their risk is not two instances overlapping - they are far
     * too short for that - but two instances firing seconds apart, the second finding the lock
     * already released. `lockAtLeastFor` holds it for the window regardless of how briefly the job
     * ran, and this is the assertion that it does.
     */
    @Test
    fun `a run after the first one finished is still skipped inside the lockAtLeastFor window`() {
        val runs = AtomicInteger()

        repeat(2) {
            lockingTaskExecutor.executeWithLock(Runnable { runs.incrementAndGet() }, oncePerHour("$TEST_LOCK-window"))
        }

        assertThat(runs.get()).isEqualTo(1)
    }

    /**
     * Two instances are two threads on two connections, which is all Postgres can tell them apart
     * by - the same way `MailOutboxConcurrentSendIT` simulates a second instance. The one that
     * arrives while the lock is held is not queued behind it; it simply does not run.
     *
     * Two threads and not one, because [LockingTaskExecutor] is deliberately re-entrant within a
     * thread: asking for a lock the current thread already holds runs the task rather than
     * deadlocking on it.
     */
    @Test
    @Timeout(30)
    fun `a second instance arriving while the lock is held does not run`() {
        val runs = AtomicInteger()
        val holderIsInside = CountDownLatch(1)
        val letHolderFinish = CountDownLatch(1)
        val executor = Executors.newSingleThreadExecutor()

        try {
            val holder = executor.submit {
                lockingTaskExecutor.executeWithLock(
                    Runnable {
                        runs.incrementAndGet()
                        holderIsInside.countDown()
                        letHolderFinish.await(20, TimeUnit.SECONDS)
                    },
                    oncePerHour("$TEST_LOCK-contended"),
                )
            }
            assertThat(holderIsInside.await(20, TimeUnit.SECONDS)).isTrue()

            lockingTaskExecutor.executeWithLock(
                Runnable { runs.incrementAndGet() },
                oncePerHour("$TEST_LOCK-contended"),
            )

            letHolderFinish.countDown()
            holder.get(20, TimeUnit.SECONDS)
        } finally {
            letHolderFinish.countDown()
            executor.shutdownNow()
        }

        assertThat(runs.get()).isEqualTo(1)
    }

    private fun oncePerHour(name: String) = LockConfiguration(Instant.now(), name, Duration.ofHours(1), Duration.ofHours(1))
}
