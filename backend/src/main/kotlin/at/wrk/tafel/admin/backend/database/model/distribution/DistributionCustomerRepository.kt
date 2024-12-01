package at.wrk.tafel.admin.backend.database.model.distribution

import org.springframework.data.jpa.repository.JpaRepository

interface DistributionCustomerRepository : JpaRepository<DistributionCustomerEntity, Long> {

    fun countAllByDistributionId(distributionId: Long): Int

    fun findByCustomerCustomerId(customerId: Long): List<DistributionCustomerEntity>

}
