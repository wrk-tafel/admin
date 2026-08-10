package at.wrk.tafel.admin.backend.modules.logistics.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.logistics.FoodUnit
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Positive

@ExcludeFromTestCoverage
data class ShopListResponse(
    val shops: List<ShopResponse>,
)

@ExcludeFromTestCoverage
data class ShopRequest(
    val id: Long?,
    @field:Positive
    val number: Int,
    @field:NotBlank
    val name: String,
    @field:NotBlank
    val addressStreet: String,
    @field:Positive
    val addressPostalCode: Int,
    @field:NotBlank
    val addressCity: String,
    val foodUnit: FoodUnit,
    val phone: String?,
    val contactPerson: String?,
    val note: String?,
    val enabled: Boolean,
)

@ExcludeFromTestCoverage
data class ShopResponse(
    val id: Long?,
    val number: Int,
    val name: String,
    val addressStreet: String,
    val addressPostalCode: Int,
    val addressCity: String,
    val foodUnit: FoodUnit,
    val phone: String?,
    val contactPerson: String?,
    val note: String?,
    val enabled: Boolean,
)
