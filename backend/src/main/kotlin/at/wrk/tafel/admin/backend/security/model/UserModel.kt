package at.wrk.tafel.admin.backend.security.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage

@ExcludeFromTestCoverage
data class ChangePasswordRequest(
    val oldPassword: String,
    val newPassword: String
)

@ExcludeFromTestCoverage
data class ChangePasswordResponse(
    val message: String,
    val details: List<String>? = emptyList()
)
