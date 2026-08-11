package at.wrk.tafel.admin.backend.database.model.staticdata

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.LocalDate

@Transactional
class StaticValueRepositoryIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var testEntityManager: TestEntityManager

    @Autowired
    private lateinit var staticValueRepository: StaticValueRepository

    @Test
    fun `findAllValidAt returns only the values in effect on the given date`() {
        val today = LocalDate.now()

        val valid = persistStaticValue(BigDecimal("999"), validFrom = today.minusDays(1), validTo = today.plusDays(1))
        val expired = persistStaticValue(BigDecimal("111"), validFrom = today.minusDays(10), validTo = today.minusDays(5))
        val notYetValid = persistStaticValue(BigDecimal("222"), validFrom = today.plusDays(5), validTo = today.plusDays(10))
        testEntityManager.flush()

        val result = staticValueRepository.findAllValidAt(today)

        assertThat(result.map { it.id }).contains(valid.id).doesNotContain(expired.id, notYetValid.id)
        assertThat(result).allMatch { !today.isBefore(it.validFrom) && !today.isAfter(it.validTo) }
    }

    @Test
    fun `findAllValidAt includes values whose validity starts or ends on the given date`() {
        val today = LocalDate.now()

        val startingToday = persistStaticValue(BigDecimal("333"), validFrom = today, validTo = today.plusDays(10))
        val endingToday = persistStaticValue(BigDecimal("444"), validFrom = today.minusDays(10), validTo = today)
        testEntityManager.flush()

        val result = staticValueRepository.findAllValidAt(today)

        assertThat(result.map { it.id }).contains(startingToday.id, endingToday.id)
    }

    @Test
    fun `findSingleValueOfType returns null when no value of that type is valid for the given date`() {
        val today = LocalDate.now()

        // the migrations seed one currently-valid row per type - findSingleValueOfType returns a
        // single entity, so it has to be the only one of its type for this test to say anything
        staticValueRepository.findAll()
            .filter { it.type == StaticValueType.COST_CONTRIBUTION }
            .forEach { staticValueRepository.delete(it) }
        staticValueRepository.flush()

        persistStaticValue(BigDecimal("1"), validFrom = today.minusDays(10), validTo = today.minusDays(5))
        testEntityManager.flush()

        val result = staticValueRepository.findSingleValueOfType(
            type = StaticValueType.COST_CONTRIBUTION,
            currentDate = today,
        )

        assertThat(result).isNull()
    }

    private fun persistStaticValue(
        amount: BigDecimal,
        validFrom: LocalDate,
        validTo: LocalDate,
    ): StaticValueEntity {
        val entity = StaticValueEntity(
            validFrom = validFrom,
            validTo = validTo,
            type = StaticValueType.COST_CONTRIBUTION,
            amount = amount,
        )
        testEntityManager.persist(entity)
        return entity
    }
}
