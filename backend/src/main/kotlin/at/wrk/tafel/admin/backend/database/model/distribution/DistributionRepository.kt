package at.wrk.tafel.admin.backend.database.model.distribution

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query

interface DistributionRepository : JpaRepository<DistributionEntity, Long> {

    @Query("SELECT d from Distribution d where d.endedAt is null order by d.startedAt desc")
    fun getCurrentDistribution(): DistributionEntity?

}
