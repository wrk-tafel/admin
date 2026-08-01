package at.wrk.tafel.admin.backend.modules.logistics.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotEmpty

@ExcludeFromTestCoverage
data class CarListResponse(
    val cars: List<CarResponse>,
)

@ExcludeFromTestCoverage
data class CarRequest(
    val id: Long?,
    @field:NotBlank
    val licensePlate: String,
    @field:NotBlank
    val name: String,
    val enabled: Boolean,
    val sortOrder: Int,
)

@ExcludeFromTestCoverage
data class CarResponse(
    val id: Long?,
    val licensePlate: String,
    val name: String,
    val enabled: Boolean,
    val sortOrder: Int,
)

@ExcludeFromTestCoverage
data class CarReorderRequest(
    @field:NotEmpty
    val carIds: List<Long>,
)
