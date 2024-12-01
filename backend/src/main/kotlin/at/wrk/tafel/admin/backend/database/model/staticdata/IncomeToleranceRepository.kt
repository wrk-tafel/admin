package at.wrk.tafel.admin.backend.database.model.staticdata

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDate
import java.util.*

interface IncomeToleranceRepository : JpaRepository<IncomeToleranceEntity, Long> {
    @Query("select it from IncomeTolerance it where :currentDate between it.validFrom and it.validTo")
    fun findCurrentValue(
        @Param("currentDate") currentDate: LocalDate
    ): Optional<IncomeToleranceEntity>
}
