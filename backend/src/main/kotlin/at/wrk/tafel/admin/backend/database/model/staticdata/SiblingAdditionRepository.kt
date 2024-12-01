package at.wrk.tafel.admin.backend.database.model.staticdata

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDate
import java.util.*

interface SiblingAdditionRepository : JpaRepository<SiblingAdditionEntity, Long> {
    @Query("select sa from SiblingAddition sa where :currentDate between sa.validFrom and sa.validTo")
    fun findCurrentValues(
        @Param("currentDate") currentDate: LocalDate
    ): List<SiblingAdditionEntity>

    @Query("select sa from SiblingAddition sa where sa.countChild = 7 and :currentDate between sa.validFrom and sa.validTo")
    fun findCurrentMaxAddition(
        @Param("currentDate") currentDate: LocalDate
    ): Optional<SiblingAdditionEntity>
}
