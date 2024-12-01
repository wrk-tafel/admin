package at.wrk.tafel.admin.backend.database.model.staticdata

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDate
import java.util.*

interface ChildTaxAllowanceRepository : JpaRepository<ChildTaxAllowanceEntity, Long> {
    @Query("select cta from ChildTaxAllowance cta where :currentDate between cta.validFrom and cta.validTo")
    fun findCurrentValue(
        @Param("currentDate") currentDate: LocalDate
    ): Optional<ChildTaxAllowanceEntity>
}
