package at.wrk.tafel.admin.backend.common.auth.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

/** Username or e-mail address - "Passwort vergessen?" accepts either. */
@ExcludeFromTestCoverage
data class PasswordResetRequest(
    @field:NotBlank
    @field:Size(max = 320)
    val identifier: String,
)

@ExcludeFromTestCoverage
data class PasswordResetConfirmRequest(
    @field:NotBlank
    @field:Size(max = 100)
    val token: String,
    @field:NotBlank
    val newPassword: String,
)

/** Why a new password was not set - the same shape `ChangePasswordResponse` has for the logged-in change. */
@ExcludeFromTestCoverage
data class PasswordResetConfirmResponse(
    val message: String,
    val details: List<String>? = emptyList(),
)

@ExcludeFromTestCoverage
data class EmailChangeConfirmRequest(
    @field:NotBlank
    @field:Size(max = 100)
    val token: String,
)

/** Why a link to confirm a new e-mail address did not work. */
@ExcludeFromTestCoverage
data class EmailChangeConfirmResponse(
    val message: String,
)
