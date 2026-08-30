package at.wrk.tafel.admin.backend.modules.base.country

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import jakarta.validation.constraints.NotBlank

@ExcludeFromTestCoverage
data class CountryListResponse(
    val items: List<CountryItem> = emptyList(),
    /** How many leading [items] are the "frequently used" group - where the frontend puts the divider. */
    val frequentlyUsedCount: Int = 0,
)

@ExcludeFromTestCoverage
data class CountryItem(
    val id: Long,
    val code: String,
    val name: String,
)

@ExcludeFromTestCoverage
data class CountryAdminListResponse(
    val items: List<CountryResponse> = emptyList(),
)

@ExcludeFromTestCoverage
data class CountryRequest(
    @field:NotBlank
    val name: String,
    val enabled: Boolean,
)

@ExcludeFromTestCoverage
data class CountryResponse(
    val id: Long,
    val code: String,
    val name: String,
    val enabled: Boolean,
)
