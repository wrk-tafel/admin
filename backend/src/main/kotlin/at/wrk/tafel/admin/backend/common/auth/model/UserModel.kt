package at.wrk.tafel.admin.backend.common.auth.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import jakarta.validation.constraints.NotBlank
import java.time.LocalDateTime

@ExcludeFromTestCoverage
data class ChangePasswordRequest(
    @field:NotBlank
    val passwordCurrent: String,
    @field:NotBlank
    val passwordNew: String,
)

@ExcludeFromTestCoverage
data class ChangePasswordResponse(
    val message: String,
    val details: List<String>? = emptyList(),
)

@ExcludeFromTestCoverage
data class UserRequest(
    val id: Long?,
    @field:NotBlank
    val personnelNumber: String,
    @field:NotBlank
    val username: String,
    @field:NotBlank
    val firstname: String,
    @field:NotBlank
    val lastname: String,
    val enabled: Boolean,
    val password: String? = null,
    val passwordRepeat: String? = null,
    val passwordChangeRequired: Boolean,
    val permissions: List<UserPermissionItem>,
)

@ExcludeFromTestCoverage
data class UserResponse(
    val id: Long?,
    val personnelNumber: String,
    val username: String,
    val firstname: String,
    val lastname: String,
    val enabled: Boolean,
    val password: String? = null,
    val passwordRepeat: String? = null,
    val passwordChangeRequired: Boolean,
    val permissions: List<UserPermissionItem>,
)

@ExcludeFromTestCoverage
data class UserPermissionItem(
    val key: String,
    val title: String,
    val category: String = "",
)

@ExcludeFromTestCoverage
data class GeneratedPasswordResponse(
    val password: String,
)

@ExcludeFromTestCoverage
data class UserInfoResponse(
    val username: String,
    val permissions: List<String>,
)

@ExcludeFromTestCoverage
data class PermissionsListResponse(
    val permissions: List<UserPermissionItem>,
)

@ExcludeFromTestCoverage
data class LoginAttemptItem(
    val id: Long,
    val username: String,
    val failureCount: Int,
    val lastFailureAt: LocalDateTime,
    val lockedUntil: LocalDateTime?,
)
