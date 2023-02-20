package at.wrk.tafel.admin.backend.database.repositories.distribution

import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionEntity
import org.springframework.data.jpa.repository.JpaRepository

interface DistributionRepository : JpaRepository<DistributionEntity, Long> {

    fun findFirstByEndedAtIsNullOrderByStartedAtDesc(): DistributionEntity

}
