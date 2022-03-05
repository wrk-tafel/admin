package at.wrk.tafel.admin.backend.modules.customer.income

import at.wrk.tafel.admin.backend.dbmodel.entities.StaticValueEntity
import at.wrk.tafel.admin.backend.dbmodel.entities.StaticValueType
import at.wrk.tafel.admin.backend.dbmodel.repositories.StaticValueRepository
import io.mockk.every
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import java.math.BigDecimal

@ExtendWith(MockKExtension::class)
class IncomeValidatorImplTest {

    private val TEST_LIMITS = mapOf(
        StaticValueType.INCPERS1 to BigDecimal("1000"),
        StaticValueType.INCPERS1CH1 to BigDecimal("1100"),
        StaticValueType.INCPERS1CH2 to BigDecimal("1200"),
        StaticValueType.INCPERS2 to BigDecimal("1500"),
        StaticValueType.INCPERS2CH1 to BigDecimal("1600"),
        StaticValueType.INCPERS2CH2 to BigDecimal("1700"),
        StaticValueType.INCPERS2CH3 to BigDecimal("1800"),
        StaticValueType.INCADDADULT to BigDecimal("200"),
        StaticValueType.INCADDCHILD to BigDecimal("100"),
        StaticValueType.INCFAMBONAGE0 to BigDecimal("10"),
        StaticValueType.INCFAMBONAGE3 to BigDecimal("30"),
        StaticValueType.INCFAMBONAGE10 to BigDecimal("90"),
        StaticValueType.INCFAMBONAGE19 to BigDecimal("190")
    )

    @RelaxedMockK
    private lateinit var staticValueRepository: StaticValueRepository

    private lateinit var incomeValidator: IncomeValidator

    @BeforeEach
    fun beforeEach() {
        every {
            staticValueRepository.findByTypeAndDate(
                any(),
                any()
            )
        } answers {
            val type = StaticValueType.valueOf(firstArg())
            val value = TEST_LIMITS[type]
            createStaticValueEntity(value!!)
        }

        incomeValidator = IncomeValidatorImpl(staticValueRepository)
    }

    @Test
    fun `no data given`() {
        assertThrows<IllegalArgumentException> { incomeValidator.validate(listOf()) }
    }

    @Test
    fun `single person below limit`() {
        val persons = listOf(
            IncomeValidatorInputPerson(
                monthlyIncome = BigDecimal("500"),
                age = 35
            )
        )

        val result = incomeValidator.validate(persons)

        assertThat(result).isTrue
    }

    @Test
    fun `single person exactly on limit`() {
        val persons = listOf(
            IncomeValidatorInputPerson(
                monthlyIncome = BigDecimal("1000"),
                age = 35
            )
        )

        val result = incomeValidator.validate(persons)

        assertThat(result).isTrue
    }

    @Test
    fun `single person above limit`() {
        val persons = listOf(
            IncomeValidatorInputPerson(
                monthlyIncome = BigDecimal("1150"),
                age = 35
            )
        )

        val result = incomeValidator.validate(persons)

        assertThat(result).isFalse
    }

    @Test
    fun `single person above limit within tolerance`() {
        val persons = listOf(
            IncomeValidatorInputPerson(
                monthlyIncome = BigDecimal("1050"),
                age = 35
            )
        )

        val result = incomeValidator.validate(persons)

        assertThat(result).isTrue
    }

    @Test
    fun `single person above limit exactly on tolerance`() {
        val persons = listOf(
            IncomeValidatorInputPerson(
                monthlyIncome = BigDecimal("1100"),
                age = 35
            )
        )

        val result = incomeValidator.validate(persons)

        assertThat(result).isTrue
    }

    @Test
    fun `two persons below limit`() {
        val persons = listOf(
            IncomeValidatorInputPerson(
                monthlyIncome = BigDecimal("700"),
                age = 35
            ),
            IncomeValidatorInputPerson(
                monthlyIncome = BigDecimal("700"),
                age = 30
            )
        )

        val result = incomeValidator.validate(persons)

        assertThat(result).isTrue
    }

    @Test
    fun `two persons above limit`() {
        val persons = listOf(
            IncomeValidatorInputPerson(
                monthlyIncome = BigDecimal("1000"),
                age = 35
            ),
            IncomeValidatorInputPerson(
                monthlyIncome = BigDecimal("1000"),
                age = 30
            )
        )

        val result = incomeValidator.validate(persons)

        assertThat(result).isFalse
    }

    @Test
    fun `three persons below limit`() {
        val persons = listOf(
            IncomeValidatorInputPerson(
                monthlyIncome = BigDecimal("250"),
                age = 35
            ),
            IncomeValidatorInputPerson(
                monthlyIncome = BigDecimal("250"),
                age = 30
            ),
            IncomeValidatorInputPerson(
                monthlyIncome = BigDecimal("250"),
                age = 30
            )
        )

        val result = incomeValidator.validate(persons)

        assertThat(result).isTrue
    }

    @Test
    fun `three persons above limit`() {
        val persons = listOf(
            IncomeValidatorInputPerson(
                monthlyIncome = BigDecimal("600"),
                age = 35
            ),
            IncomeValidatorInputPerson(
                monthlyIncome = BigDecimal("600"),
                age = 30
            ),
            IncomeValidatorInputPerson(
                monthlyIncome = BigDecimal("650"),
                age = 30
            )
        )

        val result = incomeValidator.validate(persons)

        assertThat(result).isFalse
    }

    @Test
    fun `three persons matching limit`() {
        val persons = listOf(
            IncomeValidatorInputPerson(
                monthlyIncome = BigDecimal("750"),
                age = 35
            ),
            IncomeValidatorInputPerson(
                monthlyIncome = BigDecimal("750"),
                age = 30
            ),
            IncomeValidatorInputPerson(
                monthlyIncome = BigDecimal("200"),
                age = 30
            )
        )

        val result = incomeValidator.validate(persons)

        assertThat(result).isTrue
    }

    private fun createStaticValueEntity(value: BigDecimal): StaticValueEntity {
        val staticValueEntity = StaticValueEntity()
        staticValueEntity.value = value
        return staticValueEntity
    }
}
