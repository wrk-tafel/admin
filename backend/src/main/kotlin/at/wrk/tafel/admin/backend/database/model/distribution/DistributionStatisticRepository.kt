package at.wrk.tafel.admin.backend.database.model.distribution

import org.springframework.data.jpa.repository.JpaRepository

interface DistributionStatisticRepository : JpaRepository<DistributionStatisticEntity, Long>
