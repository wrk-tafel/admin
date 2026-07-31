package at.wrk.tafel.admin.backend.modules.settings.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.PositiveOrZero
import java.math.BigDecimal
import java.time.LocalDate

@ExcludeFromTestCoverage
data class StaticValueListResponse(
    val staticValues: List<StaticValueItem>,
)

@ExcludeFromTestCoverage
data class StaticValueItem(
    val id: Long?,
    @field:NotBlank
    val type: String,
    val validFrom: LocalDate,
    val validTo: LocalDate,
    @field:PositiveOrZero
    val amount: BigDecimal?,
    @field:PositiveOrZero
    val countAdults: Int?,
    @field:PositiveOrZero
    val countChildren: Int?,
    @field:PositiveOrZero
    val age: Int?,
)
