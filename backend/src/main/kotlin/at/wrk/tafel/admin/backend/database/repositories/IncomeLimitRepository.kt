package at.wrk.tafel.admin.backend.database.repositories

import at.wrk.tafel.admin.backend.database.entities.staticdata.IncomeLimitEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

interface IncomeLimitRepository : JpaRepository<IncomeLimitEntity, Long> {
    @Query("select il from IncomeLimit il where il.countAdult = :countAdult and il.countChild = :countChild and now() between il.validFrom and il.validTo")
    fun findLatestForPersonCount(
        @Param("countAdult") countAdult: Int? = 0,
        @Param("countChild") countChild: Int? = 0
    ): IncomeLimitEntity?

    @Query("select il from IncomeLimit il where il.additionalAdult = true and now() between il.validFrom and il.validTo")
    fun findLatestAdditionalAdult(): IncomeLimitEntity?

    @Query("select il from IncomeLimit il where il.additionalChild = true and now() between il.validFrom and il.validTo")
    fun findLatestAdditionalChild(): IncomeLimitEntity?
}
