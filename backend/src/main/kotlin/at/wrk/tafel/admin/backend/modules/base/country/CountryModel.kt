package at.wrk.tafel.admin.backend.modules.base.country

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage

@ExcludeFromTestCoverage
data class CountryListResponse(
    val items: List<CountryItem> = emptyList(),
)

@ExcludeFromTestCoverage
data class CountryItem(
    val id: Long,
    val code: String,
    val name: String,
)
