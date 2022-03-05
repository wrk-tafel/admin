package at.wrk.tafel.admin.backend.modules.customer.income

import at.wrk.tafel.admin.backend.dbmodel.entities.IncomeLimitEntity
import at.wrk.tafel.admin.backend.dbmodel.entities.IncomeLimitType
import at.wrk.tafel.admin.backend.dbmodel.repositories.IncomeLimitRepository
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
        IncomeLimitType.PERS1 to BigDecimal("1000"),
        IncomeLimitType.PERS1CH1 to BigDecimal("1100"),
        IncomeLimitType.PERS1CH2 to BigDecimal("1200"),
        IncomeLimitType.PERS2 to BigDecimal("1500"),
        IncomeLimitType.PERS2CH1 to BigDecimal("1600"),
        IncomeLimitType.PERS2CH2 to BigDecimal("1700"),
        IncomeLimitType.PERS2CH3 to BigDecimal("1800"),
        IncomeLimitType.ADDADULT to BigDecimal("200"),
        IncomeLimitType.ADDCHILD to BigDecimal("100")
    )

    @RelaxedMockK
    private lateinit var incomeLimitRepository: IncomeLimitRepository

    private lateinit var incomeValidator: IncomeValidator

    @BeforeEach
    fun beforeEach() {
        every {
            incomeLimitRepository.findByTypeAndDate(
                any(),
                any()
            )
        } answers {
            val type = IncomeLimitType.valueOf(firstArg())
            val value = TEST_LIMITS[type]
            createIncomeLimitEntity(value!!)
        }

        incomeValidator = IncomeValidatorImpl(incomeLimitRepository)
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

    private fun createIncomeLimitEntity(value: BigDecimal): IncomeLimitEntity {
        val incomeLimitEntity = IncomeLimitEntity()
        incomeLimitEntity.value = value
        return incomeLimitEntity
    }
}
