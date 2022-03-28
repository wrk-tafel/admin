package at.wrk.tafel.admin.backend.dbmodel.repositories

import at.wrk.tafel.admin.backend.dbmodel.entities.staticdata.values.ChildTaxAllowanceEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import java.util.*

interface ChildTaxAllowanceRepository : JpaRepository<ChildTaxAllowanceEntity, Long> {
    @Query("select cta from ChildTaxAllowance cta where now() between cta.validFrom and cta.validTo")
    fun findCurrentValue(): Optional<ChildTaxAllowanceEntity>
}
