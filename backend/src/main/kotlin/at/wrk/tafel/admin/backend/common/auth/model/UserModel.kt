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
    val id: Long?,
    val personnelNumber: String,
    val username: String,
    val firstname: String,
    val lastname: String,
    val enabled: Boolean,
    val password: String? = null,
    val passwordRepeat: String? = null,
    val passwordChangeRequired: Boolean,
    val permissions: List<UserPermission>
)

@ExcludeFromTestCoverage
data class UserPermission(
    val key: String,
    val title: String
)

@ExcludeFromTestCoverage
data class UserListResponse(
    val items: List<User>,
    val totalCount: Long,
    val currentPage: Int,
    val totalPages: Int,
    val pageSize: Int
)

@ExcludeFromTestCoverage
data class GeneratedPasswordResponse(
    val password: String
)

@ExcludeFromTestCoverage
data class UserInfo(
    val username: String,
    val permissions: List<String>
)

@ExcludeFromTestCoverage
data class PermissionsListResponse(
    val permissions: List<UserPermission>
)
