package at.wrk.tafel.admin.backend.database.model.staticdata

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.tuple
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import java.math.BigDecimal
import java.time.LocalDate

/**
 * `R__00140_income_limits_2027.sql` hands the income limits over to the 2027 amounts on New Year's
 * Day: exactly one row per lookup key on either side of the change, the earlier one ending the day
 * before the later one starts.
 */
class IncomeLimits2027MigrationIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var staticValueRepository: StaticValueRepository

    private val incomeLimitTypes = setOf(
        StaticValueType.INCOME_LIMIT,
        StaticValueType.ADDITIONAL_ADULT,
        StaticValueType.ADDITIONAL_CHILD,
    )

    @Test
    fun `the 2027 income limits take over on New Year's Day`() {
        val valuesOn2027 = staticValueRepository.findAllValidAt(LocalDate.of(2027, 1, 1))
            .filter { it.type in incomeLimitTypes }

        assertThat(valuesOn2027)
            .extracting({ it.type }, { it.countAdults }, { it.countChildren }, { it.amount.setScale(2) }, { it.validFrom })
            .containsExactlyInAnyOrder(
                tuple(StaticValueType.INCOME_LIMIT, 1, 0, BigDecimal("1827.00"), LocalDate.of(2027, 1, 1)),
                tuple(StaticValueType.INCOME_LIMIT, 1, 1, BigDecimal("2375.00"), LocalDate.of(2027, 1, 1)),
                tuple(StaticValueType.INCOME_LIMIT, 1, 2, BigDecimal("2923.00"), LocalDate.of(2027, 1, 1)),
                tuple(StaticValueType.INCOME_LIMIT, 2, 0, BigDecimal("2740.00"), LocalDate.of(2027, 1, 1)),
                tuple(StaticValueType.INCOME_LIMIT, 2, 1, BigDecimal("3288.00"), LocalDate.of(2027, 1, 1)),
                tuple(StaticValueType.INCOME_LIMIT, 2, 2, BigDecimal("3836.00"), LocalDate.of(2027, 1, 1)),
                tuple(StaticValueType.INCOME_LIMIT, 2, 3, BigDecimal("4384.00"), LocalDate.of(2027, 1, 1)),
                tuple(StaticValueType.ADDITIONAL_ADULT, null, null, BigDecimal("913.00"), LocalDate.of(2027, 1, 1)),
                tuple(StaticValueType.ADDITIONAL_CHILD, null, null, BigDecimal("548.00"), LocalDate.of(2027, 1, 1)),
            )
    }

    @Test
    fun `the earlier income limits stay valid until the end of 2026`() {
        val valuesOnNewYearsEve = staticValueRepository.findAllValidAt(LocalDate.of(2026, 12, 31))
            .filter { it.type in incomeLimitTypes }

        assertThat(valuesOnNewYearsEve).hasSize(9)
        assertThat(valuesOnNewYearsEve).allSatisfy {
            assertThat(it.validTo).isEqualTo(LocalDate.of(2026, 12, 31))
        }
    }
}
