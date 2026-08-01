package at.wrk.tafel.admin.backend.modules.support.model

import jakarta.validation.constraints.NotBlank

data class SupportRequest(
    @field:NotBlank
    val text: String,
)
