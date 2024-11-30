package at.wrk.tafel.admin.backend.database.model.staticdata

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDate

interface IncomeLimitRepository : JpaRepository<IncomeLimitEntity, Long> {
    @Query("select il from IncomeLimit il where il.countAdult = :countAdult and il.countChild = :countChild and :currentDate between il.validFrom and il.validTo")
    fun findLatestForPersonCount(
        @Param("currentDate") currentDate: LocalDate,
        @Param("countAdult") countAdult: Int? = 0,
        @Param("countChild") countChild: Int? = 0
    ): IncomeLimitEntity?

    @Query("select il from IncomeLimit il where il.additionalAdult = true and :currentDate between il.validFrom and il.validTo")
    fun findLatestAdditionalAdult(
        @Param("currentDate") currentDate: LocalDate
    ): IncomeLimitEntity?

    @Query("select il from IncomeLimit il where il.additionalChild = true and :currentDate between il.validFrom and il.validTo")
    fun findLatestAdditionalChild(
        @Param("currentDate") currentDate: LocalDate
    ): IncomeLimitEntity?
}
