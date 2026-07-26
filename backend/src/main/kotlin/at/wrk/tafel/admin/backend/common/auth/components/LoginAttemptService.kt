package at.wrk.tafel.admin.backend.common.auth.components

import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap

/**
 * Tracks consecutive failed logins per username and locks the account temporarily once
 * [maxFailures] is reached. State is kept in-memory, which is sufficient for a single-instance
 * deployment - after a restart all counters start fresh.
 */
class LoginAttemptService(
    private val maxFailures: Int,
    private val lockoutDuration: Duration,
    private val clock: Clock = Clock.systemUTC(),
) {

    companion object {
        // stale-entry cleanup kicks in above this size to bound memory usage
        private const val CLEANUP_THRESHOLD = 1000
    }

    private data class AttemptState(
        val failures: Int,
        val lastFailureAt: Instant,
        val lockedUntil: Instant?,
    )

    private val attempts = ConcurrentHashMap<String, AttemptState>()

    fun isLocked(username: String): Boolean {
        val key = normalize(username)
        val lockedUntil = attempts[key]?.lockedUntil ?: return false

        if (lockedUntil.isBefore(now())) {
            attempts.remove(key)
            return false
        }
        return true
    }

    fun recordFailure(username: String) {
        cleanupStaleEntries()

        attempts.compute(normalize(username)) { _, state ->
            // failures older than the lockout duration don't count towards the limit anymore
            val failures =
                if (state == null || isStale(state)) 1
                else state.failures + 1

            AttemptState(
                failures = failures,
                lastFailureAt = now(),
                lockedUntil = if (failures >= maxFailures) now().plus(lockoutDuration) else null
            )
        }
    }

    fun recordSuccess(username: String) {
        attempts.remove(normalize(username))
    }

    private fun isStale(state: AttemptState): Boolean {
        val expired = state.lockedUntil?.isBefore(now()) ?: false
        val outsideWindow = state.lockedUntil == null && state.lastFailureAt.plus(lockoutDuration).isBefore(now())
        return expired || outsideWindow
    }

    private fun cleanupStaleEntries() {
        if (attempts.size > CLEANUP_THRESHOLD) {
            attempts.entries.removeIf { isStale(it.value) }
        }
    }

    private fun normalize(username: String) = username.trim().lowercase()

    private fun now(): Instant = clock.instant()

}
