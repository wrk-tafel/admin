package at.wrk.tafel.admin.backend.database.common.lock

import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith

@ExtendWith(MockKExtension::class)
class AdvisoryLockServiceTest {

    @RelaxedMockK
    private lateinit var repository: AdvisoryLockRepository

    @InjectMockKs
    private lateinit var service: AdvisoryLockService

    @Test
    fun `withLock should execute block with lock`() {
        var executed = false
        val result = service.withLock(AdvisoryLockKey.CREATE_DISTRIBUTION) {
            executed = true
            "success"
        }

        assertThat(result).isEqualTo("success")
        assertThat(executed).isTrue()
        verify { repository.acquireLock(AdvisoryLockKey.CREATE_DISTRIBUTION.lockId) }
        verify { repository.releaseLock(AdvisoryLockKey.CREATE_DISTRIBUTION.lockId) }
    }

    @Test
    fun `withLock should release lock after execution`() {
        service.withLock(AdvisoryLockKey.CREATE_DISTRIBUTION) {
            "test"
        }

        verify { repository.releaseLock(AdvisoryLockKey.CREATE_DISTRIBUTION.lockId) }
    }

    @Test
    fun `withLock should release lock even when block throws exception`() {
        assertThrows<TafelValidationException> {
            service.withLock(AdvisoryLockKey.CREATE_DISTRIBUTION) {
                throw TafelValidationException("test exception")
            }
        }

        verify { repository.acquireLock(AdvisoryLockKey.CREATE_DISTRIBUTION.lockId) }
        verify { repository.releaseLock(AdvisoryLockKey.CREATE_DISTRIBUTION.lockId) }
    }

    @Test
    fun `tryWithLock should return true when lock is acquired`() {
        every { repository.tryAcquireLock(AdvisoryLockKey.CREATE_DISTRIBUTION.lockId) } returns true

        var executed = false
        val result = service.tryWithLock(AdvisoryLockKey.CREATE_DISTRIBUTION) {
            executed = true
        }

        assertThat(result).isTrue()
        assertThat(executed).isTrue()
        verify { repository.tryAcquireLock(AdvisoryLockKey.CREATE_DISTRIBUTION.lockId) }
        verify { repository.releaseLock(AdvisoryLockKey.CREATE_DISTRIBUTION.lockId) }
    }

    @Test
    fun `tryWithLock should return false when lock cannot be acquired`() {
        every { repository.tryAcquireLock(AdvisoryLockKey.CREATE_DISTRIBUTION.lockId) } returns false

        var executed = false
        val result = service.tryWithLock(AdvisoryLockKey.CREATE_DISTRIBUTION) {
            executed = true
        }

        assertThat(result).isFalse()
        assertThat(executed).isFalse()
        verify { repository.tryAcquireLock(AdvisoryLockKey.CREATE_DISTRIBUTION.lockId) }
        verify(exactly = 0) { repository.releaseLock(any()) }
    }

    @Test
    fun `tryWithLock should release lock even when block throws exception`() {
        every { repository.tryAcquireLock(AdvisoryLockKey.CREATE_DISTRIBUTION.lockId) } returns true

        assertThrows<TafelValidationException> {
            service.tryWithLock(AdvisoryLockKey.CREATE_DISTRIBUTION) {
                throw TafelValidationException("test exception")
            }
        }

        verify { repository.tryAcquireLock(AdvisoryLockKey.CREATE_DISTRIBUTION.lockId) }
        verify { repository.releaseLock(AdvisoryLockKey.CREATE_DISTRIBUTION.lockId) }
    }

    @Test
    fun `acquireLock should call repository`() {
        service.acquireLock(AdvisoryLockKey.CREATE_DISTRIBUTION)

        verify { repository.acquireLock(AdvisoryLockKey.CREATE_DISTRIBUTION.lockId) }
    }

    @Test
    fun `tryAcquireLock should return true when repository returns true`() {
        every { repository.tryAcquireLock(AdvisoryLockKey.CREATE_DISTRIBUTION.lockId) } returns true

        val result = service.tryAcquireLock(AdvisoryLockKey.CREATE_DISTRIBUTION)

        assertThat(result).isTrue()
        verify { repository.tryAcquireLock(AdvisoryLockKey.CREATE_DISTRIBUTION.lockId) }
    }

    @Test
    fun `tryAcquireLock should return false when repository returns false`() {
        every { repository.tryAcquireLock(AdvisoryLockKey.CREATE_DISTRIBUTION.lockId) } returns false

        val result = service.tryAcquireLock(AdvisoryLockKey.CREATE_DISTRIBUTION)

        assertThat(result).isFalse()
        verify { repository.tryAcquireLock(AdvisoryLockKey.CREATE_DISTRIBUTION.lockId) }
    }

    @Test
    fun `tryAcquireLock should return false when repository returns null`() {
        every { repository.tryAcquireLock(AdvisoryLockKey.CREATE_DISTRIBUTION.lockId) } returns null

        val result = service.tryAcquireLock(AdvisoryLockKey.CREATE_DISTRIBUTION)

        assertThat(result).isFalse()
    }

    @Test
    fun `releaseLock should call repository`() {
        service.releaseLock(AdvisoryLockKey.CLOSE_DISTRIBUTION)

        verify { repository.releaseLock(AdvisoryLockKey.CLOSE_DISTRIBUTION.lockId) }
    }

    @Test
    fun `different lock keys should use different lock IDs`() {
        service.acquireLock(AdvisoryLockKey.CREATE_DISTRIBUTION)
        service.acquireLock(AdvisoryLockKey.CLOSE_DISTRIBUTION)

        verify { repository.acquireLock(AdvisoryLockKey.CREATE_DISTRIBUTION.lockId) }
        verify { repository.acquireLock(AdvisoryLockKey.CLOSE_DISTRIBUTION.lockId) }
    }

}
