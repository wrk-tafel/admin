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
    fun isLocked(username: String): Boolean = getLockedUntil(username) != null

    /**
     * The lockout an admin sees on the user search/detail screens - `null` once it has expired,
     * even though the row is only cleaned up later by [cleanupStaleEntries].
     */
    @Transactional(readOnly = true)
    fun getLockedUntil(username: String): LocalDateTime? {
        val lockedUntil = loginAttemptRepository.findByUsername(normalize(username))?.lockedUntil ?: return null
        return lockedUntil.takeIf { it.isAfter(now()) }
    }

    /**
     * Batched form of [getLockedUntil] for a page of search results - one query for the whole page
     * rather than one per row. Result is keyed by the exact strings passed in (not the normalized
     * form used for the lookup), so a caller can index it with the same [TafelUser.username] it
     * passed here. Only currently-locked usernames are present in the result map.
     */
    @Transactional(readOnly = true)
    fun getLockedUntil(usernames: Collection<String>): Map<String, LocalDateTime> {
        if (usernames.isEmpty()) {
            return emptyMap()
        }
        val originalByNormalized = usernames.associateBy { normalize(it) }
        return loginAttemptRepository.findAllByUsernameIn(originalByNormalized.keys)
            .mapNotNull { entity ->
                val original = originalByNormalized[entity.username] ?: return@mapNotNull null
                entity.lockedUntil?.takeIf { it.isAfter(now()) }?.let { original to it }
            }
            .toMap()
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
        deleteAttempts(username)
    }

    /**
     * Drops any lockout state for [username] - called when the account itself is deleted, so the
     * row does not linger until [cleanupStaleEntries] catches up with it. `login_attempts` has no FK
     * to `users` (it also tracks attempts against usernames that never existed as an account), so
     * nothing else removes it on account deletion.
     */
    @Transactional
    fun deleteAttempts(username: String) {
        loginAttemptRepository.deleteByUsername(normalize(username))
    }

    // Returns already-mapped DTOs rather than the entity itself: LoginAttemptService is called
    // directly from UserController (a @RestController), and an ArchUnit rule
    // (ProjectSpecificRulesTest) forbids controllers from depending on database entities.
    @Transactional(readOnly = true)
    fun findAll(
        pageRequest: PageRequest,
        searchInput: String? = null,
        lockedOnly: Boolean = false,
        sortBy: String? = null,
        sortDirection: String? = null,
    ): Page<LoginAttemptItem> {
        val now = now()
        var spec = LoginAttemptEntity.Specs.usernameLike(searchInput?.trim()?.lowercase().orEmpty())
        if (lockedOnly) {
            spec = spec.and(LoginAttemptEntity.Specs.lockedOnly(now))
        }

        val page = loginAttemptRepository.findAll(
            LoginAttemptEntity.Specs.orderByLockedFirst(spec, now, sortBy, sortDirection),
            pageRequest,
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
    private fun findUserIdsByUsername(usernames: List<String>): Map<String, Long> = if (usernames.isEmpty()) {
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
