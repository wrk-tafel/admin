package at.wrk.tafel.admin.backend.database.repositories.distribution

import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionStatisticEntity
import org.springframework.data.jpa.repository.JpaRepository

interface DistributionStatisticRepository : JpaRepository<DistributionStatisticEntity, Long> {

    fun findByDistributionId(distributionId: Long): DistributionStatisticEntity

}
