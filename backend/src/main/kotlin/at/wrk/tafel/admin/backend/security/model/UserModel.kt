package at.wrk.tafel.admin.backend.security.model

data class ChangePasswordRequest(
    val oldPassword: String,
    val newPassword: String
)
