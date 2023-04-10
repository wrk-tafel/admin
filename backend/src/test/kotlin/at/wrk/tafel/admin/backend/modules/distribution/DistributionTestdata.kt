package at.wrk.tafel.admin.backend.modules.distribution

import at.wrk.tafel.admin.backend.common.model.DistributionState
import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionEntity

val testDistributionEntity = DistributionEntity().apply {
    id = 123
    state = DistributionState.DISTRIBUTION
}
