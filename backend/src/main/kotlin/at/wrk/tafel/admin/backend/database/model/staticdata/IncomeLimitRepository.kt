package at.wrk.tafel.admin.backend.database.model.staticdata

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDate

interface IncomeLimitRepository : JpaRepository<IncomeLimitEntity, Long> {

    @Query("select il from IncomeLimit il where il.type = :type and il.countAdults = :countAdults and il.countChildren = :countChildren and :currentDate between il.validFrom and il.validTo")
    fun findLatestForPersonCount(
        @Param("type") type: IncomeLimitType? = IncomeLimitType.INCOME_LIMIT,
        @Param("currentDate") currentDate: LocalDate,
        @Param("countAdults") countAdults: Int? = 0,
        @Param("countChildren") countChildren: Int? = 0,
    ): IncomeLimitEntity?

    @Query("select il from IncomeLimit il where il.type = :type and :currentDate between il.validFrom and il.validTo")
    fun findSingleValueOfType(
        @Param("type") type: IncomeLimitType,
        @Param("currentDate") currentDate: LocalDate,
    ): IncomeLimitEntity?

    @Query("select il from IncomeLimit il where il.type = :type and :currentDate between il.validFrom and il.validTo")
    fun findValuesOfType(
        @Param("type") type: IncomeLimitType,
        @Param("currentDate") currentDate: LocalDate,
    ): List<IncomeLimitEntity>

}
