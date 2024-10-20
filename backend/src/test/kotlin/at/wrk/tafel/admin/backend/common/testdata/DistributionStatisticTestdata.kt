package at.wrk.tafel.admin.backend.common.testdata

import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionStatisticEntity
import java.math.BigDecimal
import java.time.LocalDateTime

val testDistributionStatistic = DistributionStatisticEntity().apply {
    id = 1
    createdAt = LocalDateTime.now()
    distribution = testDistributionEntity
    countCustomers = 10
    countPersons = 6
    countInfants = 2
    averagePersonsPerCustomer = BigDecimal("6.1")
    countCustomersNew = 1
    countPersonsNew = 2
    countCustomersProlonged = 3
    countPersonsProlonged = 4
    countCustomersUpdated = 5
}
