package at.wrk.tafel.admin.backend.database.model.staticdata

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDate

interface StaticValueRepository : JpaRepository<StaticValueEntity, Long> {

    /**
     * Every static value in effect on [currentDate] - a few dozen rows, read once per income
     * validation run and resolved from memory afterwards (see `IncomeRateCard`). Nothing here is
     * cached: an administrator's edit therefore applies to the next validation on every instance,
     * without an eviction to broadcast (ADR-0048).
     */
    @Query("select sv from StaticValue sv where :currentDate between sv.validFrom and sv.validTo")
    fun findAllValidAt(@Param("currentDate") currentDate: LocalDate): List<StaticValueEntity>

    @Query("select il from StaticValue il where il.type = :type and :currentDate between il.validFrom and il.validTo")
    fun findSingleValueOfType(
        @Param("type") type: StaticValueType,
        @Param("currentDate") currentDate: LocalDate,
    ): StaticValueEntity?
}
