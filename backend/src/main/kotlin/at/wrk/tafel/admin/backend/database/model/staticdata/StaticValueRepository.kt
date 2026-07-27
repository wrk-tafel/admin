package at.wrk.tafel.admin.backend.database.model.staticdata

import org.springframework.cache.annotation.Cacheable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDate

interface StaticValueRepository : JpaRepository<StaticValueEntity, Long> {

    // static values only ever change via a DB migration shipped with a new deployment, never at
    // runtime, so caching for the process lifetime (see CacheConfig) is safe and needs no eviction -
    // each method gets its own cache name since the default key generator only considers arguments,
    // not the method itself, and findSingleValueOfType/findValuesOfType share the same argument shape
    @Cacheable("staticValueLatestForPersonCount")
    @Query("select il from StaticValue il where il.type = :type and il.countAdults = :countAdults and il.countChildren = :countChildren and :currentDate between il.validFrom and il.validTo")
    fun findLatestForPersonCount(
        @Param("type") type: StaticValueType? = StaticValueType.INCOME_LIMIT,
        @Param("currentDate") currentDate: LocalDate,
        @Param("countAdults") countAdults: Int? = 0,
        @Param("countChildren") countChildren: Int? = 0,
    ): StaticValueEntity?

    @Cacheable("staticValueSingle")
    @Query("select il from StaticValue il where il.type = :type and :currentDate between il.validFrom and il.validTo")
    fun findSingleValueOfType(
        @Param("type") type: StaticValueType,
        @Param("currentDate") currentDate: LocalDate,
    ): StaticValueEntity?

    @Cacheable("staticValueList")
    @Query("select il from StaticValue il where il.type = :type and :currentDate between il.validFrom and il.validTo")
    fun findValuesOfType(
        @Param("type") type: StaticValueType,
        @Param("currentDate") currentDate: LocalDate,
    ): List<StaticValueEntity>

}
