package at.wrk.tafel.admin.backend.database.model.staticdata

import org.springframework.cache.annotation.Cacheable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDate

interface StaticValueRepository : JpaRepository<StaticValueEntity, Long> {

    /**
     * Static values are cached for the process lifetime (see `CacheConfig`) since
     * `HouseholdService.getHouseholdsAboveLimit()` would otherwise re-query these same rows once
     * per household validated. `SettingsService` evicts all three caches below on every
     * static-value create/update, so this is safe despite values being editable at runtime
     * through the settings UI - if you add another cached query method here, add its cache name
     * to that eviction list too, or edits will appear to silently not take effect. Each method
     * needs its *own* cache name because the default key generator only considers arguments, not
     * the method itself, and [findSingleValueOfType]/[findValuesOfType] share the same argument
     * shape and would otherwise collide.
     */
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
