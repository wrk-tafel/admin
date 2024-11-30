package at.wrk.tafel.admin.backend.database.model.staticdata

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDate

interface FamilyBonusRepository : JpaRepository<FamilyBonusEntity, Long> {
    @Query("select fb from FamilyBonus fb where :currentDate between fb.validFrom and fb.validTo")
    fun findCurrentValues(
        @Param("currentDate") currentDate: LocalDate
    ): List<FamilyBonusEntity>
}
