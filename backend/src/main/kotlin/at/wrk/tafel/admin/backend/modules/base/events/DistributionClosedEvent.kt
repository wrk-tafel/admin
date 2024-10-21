package at.wrk.tafel.admin.backend.modules.base.events

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage

@ExcludeFromTestCoverage
data class DistributionClosedEvent(
    val distributionId: Long
)
