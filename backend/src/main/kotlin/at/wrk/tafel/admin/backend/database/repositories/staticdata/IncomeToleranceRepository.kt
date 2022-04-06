package at.wrk.tafel.admin.backend.database.repositories.staticdata

import at.wrk.tafel.admin.backend.database.entities.staticdata.IncomeToleranceEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import java.util.*

interface IncomeToleranceRepository : JpaRepository<IncomeToleranceEntity, Long> {
    @Query("select it from IncomeTolerance it where now() between it.validFrom and it.validTo")
    fun findCurrentValue(): Optional<IncomeToleranceEntity>
}
