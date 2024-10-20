package at.wrk.tafel.admin.backend.modules.distribution.service.internal.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import java.math.BigDecimal

@ExcludeFromTestCoverage
data class DistributionStatisticItem(
    val countCustomers: Int,
    val countPersons: Int,
    val countInfants: Int,
    val averagePersonsPerCustomer: BigDecimal,
    val countCustomersNew: Int,
    val countCustomersUpdated: Int
)
