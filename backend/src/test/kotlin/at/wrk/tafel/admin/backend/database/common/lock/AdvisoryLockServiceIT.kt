package at.wrk.tafel.admin.backend.database.common.lock

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.transaction.support.TransactionTemplate
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

/**
 * Pins down what kind of advisory lock [AdvisoryLockService] actually takes, against a real
 * Postgres. A MockK-based unit test cannot see any of this: it only ever proves which repository
 * method was called, not which lock the database ended up holding or for how long.
 */
internal class AdvisoryLockServiceIT : TafelBaseIntegrationTest() {

    private companion object {
        val LOCK_KEY = AdvisoryLockKey.CREATE_DISTRIBUTION
    }

    @Autowired
    private lateinit var advisoryLockService: AdvisoryLockService

    @Autowired
    private lateinit var transactionTemplate: TransactionTemplate

    @Autowired
    private lateinit var jdbcTemplate: JdbcTemplate

    @Test
    fun `withLock holds the lock until the caller's transaction ends`() {
        transactionTemplate.execute {
            advisoryLockService.withLock(LOCK_KEY) { "result" }

            // The block is done, the transaction isn't - so the lock is still held. It is the
            // transaction boundary that ends the lock, nothing in the service.
            assertThat(lockHolderCount()).isEqualTo(1)
        }

        assertThat(lockHolderCount()).isZero()
    }

    @Test
    fun `withLock without a surrounding transaction releases the lock when it returns`() {
        advisoryLockService.withLock(LOCK_KEY) {
            assertThat(lockHolderCount()).isEqualTo(1)
        }

        assertThat(lockHolderCount()).isZero()
    }

    @Test
    fun `a concurrent transaction cannot take the lock while it is held`() {
        transactionTemplate.execute {
            advisoryLockService.acquireLock(LOCK_KEY)

            assertThat(tryAcquireOnAnotherConnection()).isFalse()
        }

        assertThat(tryAcquireOnAnotherConnection()).isTrue()
        assertThat(lockHolderCount()).isZero()
    }

    @Test
    fun `the lock is transaction-level, so a session-level unlock cannot release it`() {
        transactionTemplate.execute {
            advisoryLockService.acquireLock(LOCK_KEY)

            // pg_advisory_unlock only ever releases session-level locks. Calling it here releases
            // nothing and makes Postgres log "you don't own a lock of type ExclusiveLock", which is
            // why the service has no release method at all - see the module README.
            assertThat(sessionUnlock()).isFalse()
            assertThat(lockHolderCount()).isEqualTo(1)
        }

        assertThat(lockHolderCount()).isZero()
    }

    /**
     * Advisory locks split the bigint key across `classid` (high 32 bits) and `objid` (low 32 bits),
     * with `objsubid = 1` marking the single-bigint form the service uses.
     */
    private fun lockHolderCount(): Int = jdbcTemplate.queryForObject(
        """
            SELECT count(*) FROM pg_locks
            WHERE locktype = 'advisory'
              AND objsubid = 1
              AND ((classid::bigint << 32) | objid::bigint) = ?
        """.trimIndent(),
        Int::class.javaObjectType,
        LOCK_KEY.lockId,
    ) ?: 0

    private fun sessionUnlock(): Boolean = jdbcTemplate.queryForObject(
        "SELECT pg_advisory_unlock(?)",
        Boolean::class.javaObjectType,
        LOCK_KEY.lockId,
    ) ?: false

    private fun tryAcquireOnAnotherConnection(): Boolean {
        val executor = Executors.newSingleThreadExecutor()
        return try {
            executor.submit<Boolean> {
                transactionTemplate.execute { advisoryLockService.tryWithLock(LOCK_KEY) {} }
            }.get(10, TimeUnit.SECONDS)
        } finally {
            executor.shutdownNow()
        }
    }
}
