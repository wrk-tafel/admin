package at.wrk.tafel.admin.backend.modules.settings.internal

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueRepository
import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueType
import at.wrk.tafel.admin.backend.modules.settings.model.StaticValueRequest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.LocalDate

// getHouseholdsAboveLimit() relies on StaticValueRepository's lookups being @Cacheable for the
// process lifetime (see CacheConfig) - this verifies that SettingsService's updateStaticValue()
// still evicts that cache, so admin edits via the settings UI take effect immediately rather than
// only after a process restart.
@Transactional
class SettingsServiceStaticValueCacheIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var testEntityManager: TestEntityManager

    @Autowired
    private lateinit var staticValueRepository: StaticValueRepository

    @Autowired
    private lateinit var settingsService: SettingsService

    @Test
    fun `updating a static value evicts the cache used by findSingleValueOfType`() {
        val today = LocalDate.now()

        // clean slate: the real migrations already seed a TOLERANCE row spanning 2000-2999 - since
        // findSingleValueOfType returns a single entity, two rows both valid "today" would make this
        // test's own lookups throw IncorrectResultSizeDataAccessException
        staticValueRepository.findAll()
            .filter { it.type == StaticValueType.TOLERANCE }
            .forEach { staticValueRepository.delete(it) }
        staticValueRepository.flush()

        // distinctive amounts (not the seed data's) so a stale cache hit can't coincidentally match
        val entity = StaticValueEntity(
            validFrom = today.minusDays(1),
            validTo = today.plusDays(1),
            type = StaticValueType.TOLERANCE,
            amount = BigDecimal("12345.67"),
        )
        testEntityManager.persist(entity)
        testEntityManager.flush()

        val cachedBeforeUpdate = staticValueRepository.findSingleValueOfType(StaticValueType.TOLERANCE, today)
        assertThat(cachedBeforeUpdate?.amount).isEqualByComparingTo("12345.67")

        settingsService.updateStaticValue(
            entity.id!!,
            StaticValueRequest(
                id = entity.id,
                type = StaticValueType.TOLERANCE.name,
                validFrom = today.minusDays(1),
                validTo = today.plusDays(1),
                amount = BigDecimal("54321.00"),
                countAdults = null,
                countChildren = null,
                age = null,
            ),
        )

        val afterUpdate = staticValueRepository.findSingleValueOfType(StaticValueType.TOLERANCE, today)
        assertThat(afterUpdate?.amount).isEqualByComparingTo("54321.00")
    }
}
