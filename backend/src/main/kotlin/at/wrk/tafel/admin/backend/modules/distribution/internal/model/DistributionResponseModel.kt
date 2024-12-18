package at.wrk.tafel.admin.backend.modules.distribution.internal.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage

@ExcludeFromTestCoverage
data class DistributionItemResponse(
    val distribution: DistributionItem?
)

@ExcludeFromTestCoverage
data class DistributionItem(
    val id: Long
)

@ExcludeFromTestCoverage
data class AssignCustomerRequest(
    val customerId: Long,
    val ticketNumber: Int
)

@ExcludeFromTestCoverage
data class TicketNumberResponse(
    val ticketNumber: Int?
)

@ExcludeFromTestCoverage
data class DistributionStatisticData(
    val employeeCount: Int,
    val personsInShelterCount: Int,
)
