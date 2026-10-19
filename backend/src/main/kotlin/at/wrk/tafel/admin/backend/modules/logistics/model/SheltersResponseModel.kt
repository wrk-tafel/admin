package at.wrk.tafel.admin.backend.modules.logistics.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotEmpty
import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.PositiveOrZero
import jakarta.validation.constraints.Size

@ExcludeFromTestCoverage
data class ShelterListResponse(
    val shelters: List<ShelterResponse>,
)

@ExcludeFromTestCoverage
data class ShelterRequest(
    val id: Long?,
    @field:NotBlank
    val name: String,
    @field:NotBlank
    var addressStreet: String,
    @field:NotBlank
    var addressHouseNumber: String,
    var addressStairway: String?,
    var addressDoor: String?,
    @field:Positive
    var addressPostalCode: Int,
    @field:NotBlank
    var addressCity: String,
    val note: String?,
    @field:PositiveOrZero
    val personsCount: Int,
    val enabled: Boolean,
    val sortOrder: Int,
    val contacts: List<@Valid ShelterContactItem>,
    // null: not known
    val hasKitchen: Boolean? = null,
    val acceptsEverything: Boolean = false,
    val hasFreezer: Boolean = false,
    @field:Size(max = 500)
    val restrictions: String? = null,
    @field:Size(max = 500)
    val fixedQuantities: String? = null,
    val foodCategoryIds: List<Long> = emptyList(),
    val excludedFoodCategoryIds: List<Long> = emptyList(),
)

@ExcludeFromTestCoverage
data class ShelterResponse(
    val id: Long?,
    val name: String,
    var addressStreet: String,
    var addressHouseNumber: String,
    var addressStairway: String?,
    var addressDoor: String?,
    var addressPostalCode: Int,
    var addressCity: String,
    val note: String?,
    val personsCount: Int,
    val enabled: Boolean,
    val sortOrder: Int,
    val contacts: List<ShelterContactItem>,
    val hasKitchen: Boolean? = null,
    val acceptsEverything: Boolean = false,
    val hasFreezer: Boolean = false,
    val restrictions: String? = null,
    val fixedQuantities: String? = null,
    val foodCategoryIds: List<Long> = emptyList(),
    val excludedFoodCategoryIds: List<Long> = emptyList(),
)

@ExcludeFromTestCoverage
data class ShelterReorderRequest(
    @field:NotEmpty
    val shelterIds: List<Long>,
)

@ExcludeFromTestCoverage
data class ShelterContactItem(
    val firstname: String?,
    val lastname: String?,
    @field:NotBlank
    var phone: String,
)
