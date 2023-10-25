package at.wrk.tafel.admin.backend.database.repositories.distribution

import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionCustomerEntity
import org.springframework.data.jpa.repository.JpaRepository

interface DistributionCustomerRepository : JpaRepository<DistributionCustomerEntity, Long> {

    fun countAllByDistributionId(distributionId: Long): Int

    fun findByCustomerId(customerId: Long): List<DistributionCustomerEntity>

}
