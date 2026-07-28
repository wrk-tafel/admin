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

/**
 * There is no `active` boolean column - a distribution is "current" purely by data shape: the row
 * with the highest id, and only if its `endedAt` is still null. Only one distribution can ever be
 * open at a time; once the latest one is closed, this returns null until a new one is created.
 */
fun DistributionRepository.getCurrentDistribution(): DistributionEntity? {
    val latest = findFirstByOrderByIdDesc()
    return if (latest?.endedAt == null) latest else null
}
