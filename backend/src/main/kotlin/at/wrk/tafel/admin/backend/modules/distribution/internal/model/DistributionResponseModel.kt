package at.wrk.tafel.admin.backend.modules.distribution.internal.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import jakarta.validation.constraints.Positive
import java.time.LocalDateTime

@ExcludeFromTestCoverage
data class DistributionListResponse(
    val items: List<DistributionItem>,
)

@ExcludeFromTestCoverage
data class DistributionUpdateResponse(
    val distribution: DistributionItem?,
)

@ExcludeFromTestCoverage
data class DistributionItem(
    val id: Long,
    val startedAt: LocalDateTime,
    val endedAt: LocalDateTime?,
)

@ExcludeFromTestCoverage
data class AssignHouseholdRequest(
    @field:Positive
    val householdId: Long,
    @field:Positive
    val ticketNumber: Int,
)

@ExcludeFromTestCoverage
data class TicketNumberResponse(
    val ticketNumber: Int?,
)

@ExcludeFromTestCoverage
data class DistributionStatisticRequest(
    @field:Positive
    val employeeCount: Int,
    val selectedShelterIds: List<Long>,
)

@ExcludeFromTestCoverage
data class DistributionNoteRequest(
    val notes: String,
)

@ExcludeFromTestCoverage
data class DistributionCloseResponse(
    val errors: List<String>,
    val warnings: List<String>,
) {
    fun isInvalid(): Boolean = errors.isNotEmpty() || warnings.isNotEmpty()
    fun hasOnlyWarnings(): Boolean = errors.isEmpty() && warnings.isNotEmpty()
}
