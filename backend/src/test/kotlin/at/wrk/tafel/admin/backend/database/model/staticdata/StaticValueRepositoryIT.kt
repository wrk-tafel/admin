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
    fun `findLatestForPersonCount finds the matching value using default type and person counts`() {
        val today = LocalDate.now()

        val matching = StaticValueEntity(
            validFrom = today.minusDays(1),
            validTo = today.plusDays(1),
            type = StaticValueType.INCOME_LIMIT,
            amount = BigDecimal("999"),
        ).apply {
            countAdults = 0
            countChildren = 0
        }
        testEntityManager.persist(matching)

        val otherPersonCount = StaticValueEntity(
            validFrom = today.minusDays(1),
            validTo = today.plusDays(1),
            type = StaticValueType.INCOME_LIMIT,
            amount = BigDecimal("111"),
        ).apply {
            countAdults = 5
            countChildren = 5
        }
        testEntityManager.persist(otherPersonCount)
        testEntityManager.flush()

        val result = staticValueRepository.findLatestForPersonCount(currentDate = today)

        assertThat(result).isNotNull
        assertThat(result!!.id).isEqualTo(matching.id)
        assertThat(result.amount).isEqualByComparingTo(matching.amount)
    }

    @Test
    fun `findLatestForPersonCount finds the matching value for explicit person counts`() {
        val today = LocalDate.now()

        val matching = StaticValueEntity(
            validFrom = today.minusDays(1),
            validTo = today.plusDays(1),
            type = StaticValueType.INCOME_LIMIT,
            amount = BigDecimal("1234"),
        ).apply {
            countAdults = 3
            countChildren = 3
        }
        testEntityManager.persist(matching)
        testEntityManager.flush()

        val result = staticValueRepository.findLatestForPersonCount(
            currentDate = today,
            countAdults = 3,
            countChildren = 3,
        )

        assertThat(result).isNotNull
        assertThat(result!!.id).isEqualTo(matching.id)
    }

    @Test
    fun `findLatestForPersonCount finds the matching value when all parameters are given explicitly`() {
        val today = LocalDate.now()

        val matching = StaticValueEntity(
            validFrom = today.minusDays(1),
            validTo = today.plusDays(1),
            type = StaticValueType.INCOME_LIMIT,
            amount = BigDecimal("4321"),
        ).apply {
            countAdults = 4
            countChildren = 4
        }
        testEntityManager.persist(matching)
        testEntityManager.flush()

        val result = staticValueRepository.findLatestForPersonCount(
            type = StaticValueType.INCOME_LIMIT,
            currentDate = today,
            countAdults = 4,
            countChildren = 4,
        )

        assertThat(result).isNotNull
        assertThat(result!!.id).isEqualTo(matching.id)
    }

    @Test
    fun `findLatestForPersonCount returns null when no value is valid for the given date`() {
        val today = LocalDate.now()

        val expired = StaticValueEntity(
            validFrom = today.minusDays(10),
            validTo = today.minusDays(5),
            type = StaticValueType.INCOME_LIMIT,
            amount = BigDecimal("1"),
        ).apply {
            countAdults = 7
            countChildren = 7
        }
        testEntityManager.persist(expired)
        testEntityManager.flush()

        val result = staticValueRepository.findLatestForPersonCount(
            currentDate = today,
            countAdults = 7,
            countChildren = 7,
        )

        assertThat(result).isNull()
    }
}
