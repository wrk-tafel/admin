package at.wrk.tafel.admin.backend.modules.support.model

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class SupportRequest(
    @field:NotBlank
    @field:Size(max = 80)
    val title: String,
    @field:NotBlank
    val text: String,
)
