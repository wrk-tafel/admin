package at.wrk.tafel.admin.backend.common.auth.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
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

/**
 * Bound to `POST /users/search`'s body rather than `?searchInput=...` query parameters - see
 * ADR-0057 (GDPR gap G25, issue #3506/#3703: a search term is a name, and a query string ends up in
 * the never-rotated `access.log`).
 */
@ExcludeFromTestCoverage
data class UserSearchRequest(
    val searchInput: String? = null,
    val enabled: Boolean? = null,
    val page: Int? = null,
    val pageSize: Int? = null,
    val sortBy: String? = null,
    val sortDirection: String? = null,
)

/** Bound to `POST /users/login-attempts/search`'s body - same reasoning as [UserSearchRequest]. */
@ExcludeFromTestCoverage
data class LoginAttemptSearchRequest(
    val searchInput: String? = null,
    val lockedOnly: Boolean? = null,
    val page: Int? = null,
    val pageSize: Int? = null,
    val sortBy: String? = null,
    val sortDirection: String? = null,
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
    // Optional; a blank value is stored as "no address" (see UserController.mapToTafelUser).
    @field:Email
    @field:Size(max = 255)
    val email: String? = null,
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
    val email: String? = null,
    val enabled: Boolean,
    val password: String? = null,
    val passwordRepeat: String? = null,
    val passwordChangeRequired: Boolean,
    val permissions: List<UserPermissionItem>,
    // Currently active lockout from failed logins (see LoginAttemptService); null once it expired
    // or none is on record. Server-computed - never bound from a UserRequest.
    val lockedUntil: LocalDateTime? = null,
    // Server-computed, like lockedUntil - never bound from a UserRequest. Whether two-factor
    // authentication is on for the account; the secret itself never leaves the server.
    val mfaEnabled: Boolean = false,
    val mfaMethods: List<String> = emptyList(),
)

/**
 * What a user may change about their own account on the "Meine Daten" tab of "Mein Konto": the name and the
 * e-mail address. The username and the personnel number are the administrator's to assign, so they are not in
 * here - a caller sends only what the tab lets them edit, and the rest of the account cannot be reached this way.
 */
@ExcludeFromTestCoverage
data class UserAccountRequest(
    @field:NotBlank
    @field:Size(max = 50)
    val firstname: String,
    @field:NotBlank
    @field:Size(max = 50)
    val lastname: String,
    // Optional; a blank value is stored as "no address" (see UserController.updateAccount).
    @field:Email
    @field:Size(max = 255)
    val email: String? = null,
)

/** The caller's own account as the "Meine Daten" tab shows it - nothing here that belongs to an administrator. */
@ExcludeFromTestCoverage
data class UserAccountResponse(
    val username: String,
    val personnelNumber: String,
    val firstname: String,
    val lastname: String,
    val email: String? = null,
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
    val theme: UserTheme,
    // The password was accepted but the code from the authenticator app is still owed: the frontend
    // sends the user to the code page instead of treating the empty permission list as "no access".
    val mfaPending: Boolean = false,
    // The deployment requires a second factor and this user has none yet: the frontend sends them to set one up.
    val mfaSetupRequired: Boolean = false,
    // The methods the user can complete a login with - what the code page offers ("TOTP", "EMAIL").
    val mfaMethods: List<String> = emptyList(),
)

/** How the interface is coloured; [SYSTEM] follows the operating system's light/dark setting. */
enum class UserTheme {
    LIGHT,
    DARK,
    SYSTEM,
}

@ExcludeFromTestCoverage
data class UserThemeRequest(
    val theme: UserTheme,
)

@ExcludeFromTestCoverage
data class UserThemeResponse(
    val theme: UserTheme,
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
    /** The account behind [username], if one exists - a failed login names no account by itself. */
    val userId: Long? = null,
)

/**
 * The lockout rule the counts on the login-attempts screen are measured against - without it a
 * failure count is a number without a scale.
 */
@ExcludeFromTestCoverage
data class LoginAttemptSettingsResponse(
    val maxFailures: Int,
    val lockoutDurationInSeconds: Long,
)
