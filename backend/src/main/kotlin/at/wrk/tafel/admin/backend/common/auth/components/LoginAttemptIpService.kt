package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.sanitizeForLog
import at.wrk.tafel.admin.backend.config.properties.ApplicationProperties
import at.wrk.tafel.admin.backend.database.common.lock.AdvisoryLockKey
import at.wrk.tafel.admin.backend.database.common.lock.AdvisoryLockService
import at.wrk.tafel.admin.backend.database.model.auth.LoginAttemptIpEntity
import at.wrk.tafel.admin.backend.database.model.auth.LoginAttemptIpRepository
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDateTime
import java.util.concurrent.TimeUnit

/**
 * The IP-scoped counterpart to [LoginAttemptService]: tracks consecutive failed logins per calling
 * IP (across however many different usernames were tried) and locks the IP out temporarily once
 * [at.wrk.tafel.admin.backend.config.properties.SecurityLoginAttemptsIpProperties.maxFailures] is
 * reached - closing the gap a purely per-username counter leaves open for a distributed guesser.
 * State is database-backed like [LoginAttemptService], for the same reason: the limit has to apply
 * cluster-wide, not per instance (unlike [IpRateLimiterService], which only throttles request rate
 * and needs no such coordination).
 */
@Service
class LoginAttemptIpService(
    private val loginAttemptIpRepository: LoginAttemptIpRepository,
    private val advisoryLockService: AdvisoryLockService,
    private val applicationProperties: ApplicationProperties,
    private val clock: Clock,
) {

    companion object {
        private val log = LoggerFactory.getLogger(LoginAttemptIpService::class.java)
    }

    @Transactional(readOnly = true)
    fun isLocked(ipAddress: String): Boolean {
        val lockedUntil = loginAttemptIpRepository.findByIpAddress(ipAddress)?.lockedUntil ?: return false
        return lockedUntil.isAfter(now())
    }

    @Transactional
    fun recordFailure(ipAddress: String) {
        advisoryLockService.withLock(AdvisoryLockKey.LOGIN_ATTEMPT_IP_TRACKING) {
            val entry = loginAttemptIpRepository.findByIpAddress(ipAddress)
                ?: LoginAttemptIpEntity(ipAddress = ipAddress, lastFailureAt = now())

            // failures older than the lockout duration don't count towards the limit anymore
            val failureCount = if (isStale(entry)) 1 else entry.failureCount + 1

            entry.failureCount = failureCount
            entry.lastFailureAt = now()
            val locked = failureCount >= maxFailures()
            entry.lockedUntil = if (locked) now().plusSeconds(lockoutDurationInSeconds()) else null

            loginAttemptIpRepository.save(entry)

            if (locked) {
                log.warn(
                    "IP '{}' locked out until {} after {} consecutive failed login attempts across usernames",
                    sanitizeForLog(ipAddress),
                    entry.lockedUntil,
                    failureCount,
                )
            }
        }
    }

    @Transactional
    fun recordSuccess(ipAddress: String) {
        loginAttemptIpRepository.findByIpAddress(ipAddress)?.let { loginAttemptIpRepository.delete(it) }
    }

    // A row whose last failure is older than the lockout duration is irrelevant - mirrors
    // LoginAttemptService.cleanupStaleEntries.
    @Scheduled(fixedDelay = 1, timeUnit = TimeUnit.HOURS)
    @Transactional
    fun cleanupStaleEntries() {
        loginAttemptIpRepository.deleteAllByLastFailureAtBeforeSkipLocked(now().minusSeconds(lockoutDurationInSeconds()))
    }

    private fun isStale(entry: LoginAttemptIpEntity): Boolean = entry.lastFailureAt.plusSeconds(lockoutDurationInSeconds()).isBefore(now())

    private fun maxFailures() = applicationProperties.security.loginAttemptsIp.maxFailures

    private fun lockoutDurationInSeconds() = applicationProperties.security.loginAttemptsIp.lockoutDurationInSeconds

    private fun now(): LocalDateTime = LocalDateTime.now(clock)
}
