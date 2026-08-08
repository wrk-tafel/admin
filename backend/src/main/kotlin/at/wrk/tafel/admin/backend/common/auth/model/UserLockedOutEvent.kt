package at.wrk.tafel.admin.backend.common.auth.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage

/**
 * Published by `LoginAttemptService` when an account is locked after too many consecutive failed
 * logins, so that a lockout is something the team can be told about rather than only a line in a log
 * nobody reads. [username] is the normalized username the failures were recorded against - it need
 * not correspond to an account that exists, since failed logins are tracked by whatever was typed.
 */
@ExcludeFromTestCoverage
data class UserLockedOutEvent(
    val username: String,
    val failureCount: Int,
)
