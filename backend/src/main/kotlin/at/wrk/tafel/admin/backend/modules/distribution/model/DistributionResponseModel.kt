package at.wrk.tafel.admin.backend.modules.distribution.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage

@ExcludeFromTestCoverage
data class DistributionItemResponse(
    val distribution: DistributionItem?
)

@ExcludeFromTestCoverage
data class DistributionItem(
    val id: Long,
    val state: DistributionStateItem? = null
)

@ExcludeFromTestCoverage
data class DistributionStatesResponse(
    val states: List<DistributionStateItem>
)

@ExcludeFromTestCoverage
data class DistributionStateItem(
    val name: String,
    val stateLabel: String,
    val actionLabel: String?
)

@ExcludeFromTestCoverage
data class AssignCustomerRequest(
    val customerId: Long,
    val ticketNumber: Int
)
