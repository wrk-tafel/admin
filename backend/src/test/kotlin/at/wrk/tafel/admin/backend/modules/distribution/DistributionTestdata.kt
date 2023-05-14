package at.wrk.tafel.admin.backend.modules.distribution

import at.wrk.tafel.admin.backend.common.model.DistributionState
import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionCustomerEntity
import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.modules.customer.testCustomerEntity1
import at.wrk.tafel.admin.backend.modules.customer.testCustomerEntity2
import at.wrk.tafel.admin.backend.modules.customer.testCustomerEntity3
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
    ticketNumber = 50
    processed = false
}

val testDistributionCustomerEntity2 = DistributionCustomerEntity().apply {
    id = 2
    createdAt = ZonedDateTime.now()
    distribution = testDistributionEntity
    customer = testCustomerEntity2
    ticketNumber = 51
    processed = false
}

val testDistributionCustomerEntity3 = DistributionCustomerEntity().apply {
    id = 3
    createdAt = ZonedDateTime.now()
    distribution = testDistributionEntity
    customer = testCustomerEntity3
    ticketNumber = 52
    processed = false
}
