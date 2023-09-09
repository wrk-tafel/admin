package at.wrk.tafel.admin.backend.common.auth.model

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

@ExcludeFromTestCoverage
data class User(
    val id: Long,
    val personnelNumber: String,
    val username: String,
    val firstname: String,
    val lastname: String
)

@ExcludeFromTestCoverage
data class UserListResponse(
    val items: List<User>
)
