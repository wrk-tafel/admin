package at.wrk.tafel.admin.backend.common.events

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage

@ExcludeFromTestCoverage
data class DistributionClosedEvent(
    val distributionId: Long
)
