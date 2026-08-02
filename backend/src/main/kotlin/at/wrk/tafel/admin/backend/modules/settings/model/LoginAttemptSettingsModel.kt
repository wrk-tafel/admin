package at.wrk.tafel.admin.backend.modules.settings.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import java.time.LocalDateTime

@ExcludeFromTestCoverage
data class LoginAttemptListResponse(
    val loginAttempts: List<LoginAttemptItem>,
)

@ExcludeFromTestCoverage
data class LoginAttemptItem(
    val id: Long,
    val username: String,
    val failureCount: Int,
    val lastFailureAt: LocalDateTime,
    val lockedUntil: LocalDateTime?,
)
