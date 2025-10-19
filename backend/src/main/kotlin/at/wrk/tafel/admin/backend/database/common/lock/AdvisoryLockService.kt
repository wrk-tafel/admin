package at.wrk.tafel.admin.backend.database.common.lock

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class AdvisoryLockService(
    private val advisoryLockRepository: AdvisoryLockRepository
) {

    @Transactional
    fun <T> withLock(lockKey: AdvisoryLockKey, block: () -> T): T {
        try {
            acquireLock(lockKey)
            return block()
        } finally {
            releaseLock(lockKey)
        }
    }

    @Transactional
    fun tryWithLock(lockKey: AdvisoryLockKey, block: () -> Unit): Boolean {
        val acquired = tryAcquireLock(lockKey)
        if (acquired) {
            try {
                block()
            } finally {
                releaseLock(lockKey)
            }
        }
        return acquired
    }

    @Transactional
    fun acquireLock(lockKey: AdvisoryLockKey) {
        advisoryLockRepository.acquireLock(lockKey.lockId)
    }

    @Transactional
    fun tryAcquireLock(lockKey: AdvisoryLockKey): Boolean {
        return advisoryLockRepository.tryAcquireLock(lockKey.lockId) ?: false
    }

    @Transactional
    fun releaseLock(lockKey: AdvisoryLockKey) {
        advisoryLockRepository.releaseLock(lockKey.lockId)
    }

}
