package at.wrk.tafel.admin.backend.modules.household.internal.income

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueRepository
import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueType
import at.wrk.tafel.admin.backend.modules.settings.internal.SettingsService
import at.wrk.tafel.admin.backend.modules.settings.model.StaticValueRequest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.LocalDate

// Nothing caches static values: a validation reads the ones in effect today and resolves every
// lookup from that snapshot (ADR-0048), so an amount edited through the settings UI applies to the
// next validation - on the editing instance and on every other one, without an eviction to
// broadcast and without a restart.
@Transactional
class IncomeValidatorServiceStaticValueIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var staticValueRepository: StaticValueRepository

    @Autowired
    private lateinit var settingsService: SettingsService

    @Autowired
    private lateinit var incomeValidatorService: IncomeValidatorService

    @Test
    fun `an edited static value applies to the next validation`() {
        val today = LocalDate.now()
        val persons = listOf(
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("500"),
                birthDate = today.minusYears(35),
            ),
        )

        val tolerance = staticValueRepository.findSingleValueOfType(StaticValueType.TOLERANCE, today)!!
        val resultBefore = incomeValidatorService.validate(persons)
        assertThat(resultBefore.toleranceValue).isEqualByComparingTo(tolerance.amount)

        // a distinctive amount (not the seed data's) so a stale value can't coincidentally match
        val newTolerance = BigDecimal("12345.67")
        settingsService.updateStaticValue(
            tolerance.id!!,
            StaticValueRequest(
                id = tolerance.id,
                type = StaticValueType.TOLERANCE.name,
                validFrom = tolerance.validFrom,
                validTo = tolerance.validTo,
                amount = newTolerance,
                countAdults = tolerance.countAdults,
                countChildren = tolerance.countChildren,
                age = tolerance.age,
            ),
        )

        val resultAfter = incomeValidatorService.validate(persons)

        assertThat(resultAfter.toleranceValue).isEqualByComparingTo(newTolerance)
        assertThat(resultAfter.limit).isEqualByComparingTo(
            resultBefore.limit.subtract(resultBefore.toleranceValue).add(newTolerance),
        )
    }

    @Test
    fun `every household of one run is validated against the same values`() {
        val today = LocalDate.now()
        val household = listOf(
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("500"),
                birthDate = today.minusYears(35),
            ),
        )

        val results = incomeValidatorService.validateAll(listOf(household, household, household))

        assertThat(results).hasSize(3)
        assertThat(results.map { it.getOrThrow().limit }.distinct()).hasSize(1)
        assertThat(results.map { it.getOrThrow().toleranceValue }.distinct()).hasSize(1)
    }
}
