package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.auth.model.LoginAttemptItem
import at.wrk.tafel.admin.backend.common.auth.model.LoginAttemptSettingsResponse
import at.wrk.tafel.admin.backend.common.auth.model.UserLockedOutEvent
import at.wrk.tafel.admin.backend.common.sanitizeForLog
import at.wrk.tafel.admin.backend.config.properties.ApplicationProperties
import at.wrk.tafel.admin.backend.database.common.lock.AdvisoryLockKey
import at.wrk.tafel.admin.backend.database.common.lock.AdvisoryLockService
import at.wrk.tafel.admin.backend.database.model.auth.LoginAttemptEntity
import at.wrk.tafel.admin.backend.database.model.auth.LoginAttemptRepository
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import org.slf4j.LoggerFactory
import org.springframework.context.ApplicationEventPublisher
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
    private val userRepository: UserRepository,
    private val advisoryLockService: AdvisoryLockService,
    private val applicationProperties: ApplicationProperties,
    private val clock: Clock,
    private val eventPublisher: ApplicationEventPublisher,
) {

    companion object {
        private val log = LoggerFactory.getLogger(LoginAttemptService::class.java)
    }

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
                ?: LoginAttemptEntity(username = key, lastFailureAt = now())

            // failures older than the lockout duration don't count towards the limit anymore
            val failureCount = if (isStale(entry)) 1 else entry.failureCount + 1

            entry.failureCount = failureCount
            entry.lastFailureAt = now()
            val locked = failureCount >= maxFailures()
            entry.lockedUntil = if (locked) now().plusSeconds(lockoutDurationInSeconds()) else null

            loginAttemptRepository.save(entry)

            if (locked) {
                log.warn(
                    "User '{}' locked out until {} after {} consecutive failed login attempts",
                    sanitizeForLog(key),
                    entry.lockedUntil,
                    failureCount,
                )
                // Published from inside the transaction rather than after it commits: a rollback here
                // would at worst announce a lockout that didn't stick, which is the harmless
                // direction to be wrong in for a notification, and an after-commit listener would
                // silently publish nothing at all if this were ever called without a transaction.
                eventPublisher.publishEvent(UserLockedOutEvent(username = key, failureCount = failureCount))
            }
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
    fun findAll(pageRequest: PageRequest, searchInput: String? = null, lockedOnly: Boolean = false): Page<LoginAttemptItem> {
        val page = loginAttemptRepository.findAllFiltered(
            usernamePattern = "%${searchInput?.trim()?.lowercase().orEmpty()}%",
            lockedOnly = lockedOnly,
            now = now(),
            pageRequest = pageRequest,
        )

        val userIdsByUsername = findUserIdsByUsername(page.content.map { it.username })
        return page.map { mapToItem(it, userIdsByUsername[it.username]) }
    }

    /** The lockout rule the screen states, so a failure count is shown against the limit it counts towards. */
    fun getSettings() = LoginAttemptSettingsResponse(
        maxFailures = maxFailures(),
        lockoutDurationInSeconds = lockoutDurationInSeconds(),
    )

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
        loginAttemptRepository.deleteAllByLastFailureAtBeforeSkipLocked(now().minusSeconds(lockoutDurationInSeconds()))
    }

    private fun mapToItem(entity: LoginAttemptEntity, userId: Long?) = LoginAttemptItem(
        id = entity.id!!,
        username = entity.username,
        failureCount = entity.failureCount,
        lastFailureAt = entity.lastFailureAt,
        lockedUntil = entity.lockedUntil,
        userId = userId,
    )

    /**
     * A failed login names no account: the username typed at the login screen is recorded whether it
     * exists or not, which is exactly why a typo'd one has to stay unlinked instead of guessed at.
     */
    private fun findUserIdsByUsername(usernames: List<String>): Map<String, Long> =
        if (usernames.isEmpty()) {
            emptyMap()
        } else {
            userRepository.findIdsByUsernames(usernames).associate { it.username to it.userId }
        }

    private fun isStale(entry: LoginAttemptEntity): Boolean = entry.lastFailureAt.plusSeconds(lockoutDurationInSeconds()).isBefore(now())

    private fun maxFailures() = applicationProperties.security.loginAttempts.maxFailures

    private fun lockoutDurationInSeconds() = applicationProperties.security.loginAttempts.lockoutDurationInSeconds

    private fun normalize(username: String) = username.trim().lowercase()

    private fun now(): LocalDateTime = LocalDateTime.now(clock)
}
