package at.wrk.tafel.admin.backend.database.model.distribution

import org.springframework.data.jpa.repository.JpaRepository

interface DistributionHouseholdRepository : JpaRepository<DistributionHouseholdEntity, Long> {

    fun countAllByDistributionId(distributionId: Long): Int

    fun findByDistributionId(distributionId: Long): List<DistributionHouseholdEntity>
}
