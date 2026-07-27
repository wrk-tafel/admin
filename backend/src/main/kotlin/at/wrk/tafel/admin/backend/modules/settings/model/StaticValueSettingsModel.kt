package at.wrk.tafel.admin.backend.modules.settings.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import java.math.BigDecimal
import java.time.LocalDate

@ExcludeFromTestCoverage
data class StaticValueListResponse(
    val staticValues: List<StaticValueItem>,
)

@ExcludeFromTestCoverage
data class StaticValueItem(
    val id: Long?,
    val type: String,
    val validFrom: LocalDate,
    val validTo: LocalDate,
    val amount: BigDecimal?,
    val countAdults: Int?,
    val countChildren: Int?,
    val age: Int?,
)
