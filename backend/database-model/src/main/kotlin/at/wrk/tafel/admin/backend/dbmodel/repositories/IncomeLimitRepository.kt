package at.wrk.tafel.admin.backend.dbmodel.repositories

import at.wrk.tafel.admin.backend.dbmodel.entities.IncomeLimitEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDate

interface IncomeLimitRepository : JpaRepository<IncomeLimitEntity, Long> {
    @Query("select il from IncomeLimit il where il.type = :type and :validDate between il.validFrom and il.validTo")
    fun findByTypeAndDate(
        @Param("type") type: String,
        @Param("validDate") validDate: LocalDate
    ): IncomeLimitEntity?
}
