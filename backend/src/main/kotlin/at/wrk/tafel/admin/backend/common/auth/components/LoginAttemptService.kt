package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.auth.model.LoginAttemptItem
import at.wrk.tafel.admin.backend.config.properties.ApplicationProperties
import at.wrk.tafel.admin.backend.database.common.lock.AdvisoryLockKey
import at.wrk.tafel.admin.backend.database.common.lock.AdvisoryLockService
import at.wrk.tafel.admin.backend.database.model.auth.LoginAttemptEntity
import at.wrk.tafel.admin.backend.database.model.auth.LoginAttemptRepository
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDateTime
import java.util.concurrent.TimeUnit

/**
 * Tracks consecutive failed logins per username and locks the account temporarily once the
 * configured limit is reached. State is stored in the database so the limit applies across
 * all application instances; concurrent updates are serialized via an advisory lock.
 */
@Service
class LoginAttemptService(
    private val loginAttemptRepository: LoginAttemptRepository,
    private val advisoryLockService: AdvisoryLockService,
    private val applicationProperties: ApplicationProperties,
    private val clock: Clock,
) {

    @Transactional(readOnly = true)
    fun isLocked(username: String): Boolean {
        val lockedUntil = loginAttemptRepository.findByUsername(normalize(username))?.lockedUntil ?: return false
        return lockedUntil.isAfter(now())
    }

    @Transactional
    fun recordFailure(username: String) {
        advisoryLockService.withLock(AdvisoryLockKey.LOGIN_ATTEMPT_TRACKING) {
            val key = normalize(username)
            val entry = loginAttemptRepository.findByUsername(key)
                ?: LoginAttemptEntity().apply {
                    this.username = key
                    this.failureCount = 0
                }

            // failures older than the lockout duration don't count towards the limit anymore
            val failureCount = if (isStale(entry)) 1 else (entry.failureCount ?: 0) + 1

            entry.failureCount = failureCount
            entry.lastFailureAt = now()
            entry.lockedUntil =
                if (failureCount >= maxFailures()) now().plusSeconds(lockoutDurationInSeconds()) else null

            loginAttemptRepository.save(entry)
        }
    }

    @Transactional
    fun recordSuccess(username: String) {
        loginAttemptRepository.deleteByUsername(normalize(username))
    }

    // Returns already-mapped DTOs rather than the entity itself: LoginAttemptService is called
    // directly from UserController (a @RestController), and an ArchUnit rule
    // (ProjectSpecificRulesTest) forbids controllers from depending on database entities.
    @Transactional(readOnly = true)
    fun findAll(pageRequest: PageRequest): Page<LoginAttemptItem> = loginAttemptRepository.findAllByOrderByLastFailureAtDescIdDesc(pageRequest).map { mapToItem(it) }

    @Transactional
    fun deleteById(id: Long) {
        if (!loginAttemptRepository.existsById(id)) {
            throw NotFoundException("Anmelde-Versuch (ID: $id) nicht vorhanden!")
        }
        loginAttemptRepository.deleteById(id)
    }

    // A row whose last failure is older than the lockout duration is irrelevant: an active lock
    // would already have expired and the failures no longer count towards the limit.
    @Scheduled(fixedDelay = 1, timeUnit = TimeUnit.HOURS)
    @Transactional
    fun cleanupStaleEntries() {
        loginAttemptRepository.deleteAllByLastFailureAtBefore(now().minusSeconds(lockoutDurationInSeconds()))
    }

    private fun mapToItem(entity: LoginAttemptEntity) = LoginAttemptItem(
        id = entity.id!!,
        username = entity.username!!,
        failureCount = entity.failureCount ?: 0,
        lastFailureAt = entity.lastFailureAt!!,
        lockedUntil = entity.lockedUntil,
    )

    private fun isStale(entry: LoginAttemptEntity): Boolean {
        val lastFailureAt = entry.lastFailureAt ?: return false
        return lastFailureAt.plusSeconds(lockoutDurationInSeconds()).isBefore(now())
    }

    private fun maxFailures() = applicationProperties.security.loginAttempts.maxFailures

    private fun lockoutDurationInSeconds() = applicationProperties.security.loginAttempts.lockoutDurationInSeconds

    private fun normalize(username: String) = username.trim().lowercase()

    private fun now(): LocalDateTime = LocalDateTime.now(clock)
}
