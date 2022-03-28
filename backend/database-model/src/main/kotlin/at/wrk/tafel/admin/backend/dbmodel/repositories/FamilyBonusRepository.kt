package at.wrk.tafel.admin.backend.dbmodel.repositories

import at.wrk.tafel.admin.backend.dbmodel.entities.staticdata.values.FamilyBonusEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query

interface FamilyBonusRepository : JpaRepository<FamilyBonusEntity, Long> {
    @Query("select fb from FamilyBonus fb where now() between fb.validFrom and fb.validTo")
    fun findCurrentValues(): List<FamilyBonusEntity>
}
