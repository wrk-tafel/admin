package at.wrk.tafel.admin.backend.modules.settings.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.PositiveOrZero
import java.math.BigDecimal
import java.time.LocalDate

@ExcludeFromTestCoverage
data class StaticValueListResponse(
    val staticValues: List<StaticValueResponse>,
)

@ExcludeFromTestCoverage
data class StaticValueRequest(
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

@ExcludeFromTestCoverage
data class StaticValueResponse(
    val id: Long?,
    val type: String,
    val validFrom: LocalDate,
    val validTo: LocalDate,
    val amount: BigDecimal?,
    val countAdults: Int?,
    val countChildren: Int?,
    val age: Int?,
)
