package at.wrk.tafel.admin.backend.modules.base.country

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage

@ExcludeFromTestCoverage
data class CountryListResponse(
    val items: List<Country> = emptyList()
)

@ExcludeFromTestCoverage
data class Country(
    val id: Long,
    val code: String,
    val name: String
)
