package at.wrk.tafel.admin.backend.security.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage

@ExcludeFromTestCoverage
data class ChangePasswordRequest(
    val passwordCurrent: String,
    val passwordNew: String
)

@ExcludeFromTestCoverage
data class ChangePasswordResponse(
    val message: String,
    val details: List<String>? = emptyList()
)
