package at.wrk.tafel.admin.backend.dbmodel.repositories

import at.wrk.tafel.admin.backend.dbmodel.entities.StaticValueEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDate

interface StaticValueRepository : JpaRepository<StaticValueEntity, Long> {
    @Query("select sv from StaticValue sv where sv.type = :type and :validDate between sv.validFrom and sv.validTo")
    fun findByTypeAndDate(
        @Param("type") type: String,
        @Param("validDate") validDate: LocalDate
    ): StaticValueEntity?
}
