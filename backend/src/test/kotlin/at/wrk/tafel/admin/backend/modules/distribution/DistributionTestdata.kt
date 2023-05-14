package at.wrk.tafel.admin.backend.modules.distribution

import at.wrk.tafel.admin.backend.common.model.DistributionState
import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionCustomerEntity
import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.modules.customer.testCustomerEntity1
import at.wrk.tafel.admin.backend.modules.customer.testCustomerEntity2
import java.time.ZonedDateTime

val testDistributionEntity = DistributionEntity().apply {
    id = 123
    state = DistributionState.DISTRIBUTION
}

val testDistributionCustomerEntity1 = DistributionCustomerEntity().apply {
    id = 1
    createdAt = ZonedDateTime.now()
    distribution = testDistributionEntity
    customer = testCustomerEntity1
    ticketNumber = 1
    processed = false
}

val testDistributionCustomerEntity2 = DistributionCustomerEntity().apply {
    id = 2
    createdAt = ZonedDateTime.now()
    distribution = testDistributionEntity
    customer = testCustomerEntity2
    ticketNumber = 2
    processed = false
}
