package at.wrk.tafel.admin.backend.modules.distribution.internal.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage

@ExcludeFromTestCoverage
data class DistributionItemUpdate(
    val distribution: DistributionItem?,
)

@ExcludeFromTestCoverage
data class DistributionItem(
    val id: Long,
)

@ExcludeFromTestCoverage
data class AssignCustomerRequest(
    val customerId: Long,
    val ticketNumber: Int,
    val costContributionPaid: Boolean,
)

@ExcludeFromTestCoverage
data class TicketNumberResponse(
    val ticketNumber: Int?,
    val costContributionPaid: Boolean,
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
