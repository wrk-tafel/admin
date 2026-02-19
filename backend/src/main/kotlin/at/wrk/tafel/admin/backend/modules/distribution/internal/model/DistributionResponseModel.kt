package at.wrk.tafel.admin.backend.modules.distribution.internal.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import java.time.LocalDateTime

@ExcludeFromTestCoverage
data class DistributionListResponse(
    val items: List<DistributionItem>,
)

@ExcludeFromTestCoverage
data class DistributionItemUpdate(
    val distribution: DistributionItem?,
)

@ExcludeFromTestCoverage
data class DistributionItem(
    val id: Long,
    val startedAt: LocalDateTime,
    val endedAt: LocalDateTime?,
)

@ExcludeFromTestCoverage
data class AssignCustomerRequest(
    val customerId: Long,
    val ticketNumber: Int,
)

@ExcludeFromTestCoverage
data class TicketNumberResponse(
    val ticketNumber: Int?
)

@ExcludeFromTestCoverage
data class DistributionStatisticData(
    val employeeCount: Int,
    val selectedShelterIds: List<Long>,
)

@ExcludeFromTestCoverage
data class DistributionNoteData(
    val notes: String,
)

@ExcludeFromTestCoverage
data class DistributionCloseValidationResult(
    val errors: List<String>,
    val warnings: List<String>,
) {
    fun isInvalid(): Boolean = errors.isNotEmpty() || warnings.isNotEmpty()
    fun hasOnlyWarnings(): Boolean = errors.isEmpty() && warnings.isNotEmpty()
}
