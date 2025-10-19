package at.wrk.tafel.admin.backend.database.model.distribution

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

interface DistributionRepository : JpaRepository<DistributionEntity, Long> {

    fun findFirstByOrderByIdDesc(): DistributionEntity?

    @Query("SELECT d from Distribution d where year(d.startedAt) = :year order by d.startedAt asc")
    fun getDistributionsForYear(@Param("year") year: Int): List<DistributionEntity>

    fun getDistributionEntityByEndedAtIsNotNullOrderByStartedAtDesc(): List<DistributionEntity>

}

fun DistributionRepository.getCurrentDistribution(): DistributionEntity? {
    val latest = findFirstByOrderByIdDesc()
    return if (latest?.endedAt == null) latest else null
}
