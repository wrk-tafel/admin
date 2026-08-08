package at.wrk.tafel.admin.backend.database.common.lock

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * Mutual exclusion via PostgreSQL transaction-level advisory locks.
 *
 * Every lock lives until the surrounding transaction ends - PostgreSQL releases it on COMMIT or
 * ROLLBACK, which is why nothing here releases a lock explicitly. When a caller already runs in a
 * transaction, that outer transaction is the one that owns the lock's lifetime: the lock outlives
 * the block passed to [withLock]/[tryWithLock] and is only released once the caller's transaction
 * finishes. Keep that in mind when locking early in a long transaction.
 */
@Service
class AdvisoryLockService(
    private val advisoryLockRepository: AdvisoryLockRepository,
) {

    /**
     * Blocks until the lock is acquired, then runs [block] and returns its result.
     */
    @Transactional
    fun <T> withLock(lockKey: AdvisoryLockKey, block: () -> T): T {
        acquireLock(lockKey)
        return block()
    }

    /**
     * Runs [block] and returns `true` if the lock was free, or returns `false` immediately without
     * running [block] if it is held elsewhere.
     */
    @Transactional
    fun tryWithLock(lockKey: AdvisoryLockKey, block: () -> Unit): Boolean {
        val acquired = tryAcquireLock(lockKey)
        if (acquired) {
            block()
        }
        return acquired
    }

    @Transactional
    fun acquireLock(lockKey: AdvisoryLockKey) {
        advisoryLockRepository.acquireLock(lockKey.lockId)
    }

    @Transactional
    fun tryAcquireLock(lockKey: AdvisoryLockKey): Boolean = advisoryLockRepository.tryAcquireLock(lockKey.lockId) ?: false
}
