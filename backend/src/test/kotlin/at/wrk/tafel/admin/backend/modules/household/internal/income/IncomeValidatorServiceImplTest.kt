package at.wrk.tafel.admin.backend.modules.household.internal.income

import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueRepository
import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueType
import io.mockk.every
import io.mockk.impl.annotations.MockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import java.math.BigDecimal
import java.time.LocalDate

@ExtendWith(MockKExtension::class)
class IncomeValidatorServiceImplTest {

    private val mockIncomeLimits = listOf(
        StaticValueMockData(value = BigDecimal("1000"), countAdult = 1),
        StaticValueMockData(value = BigDecimal("1100"), countAdult = 1, countChild = 1),
        StaticValueMockData(value = BigDecimal("1200"), countAdult = 1, countChild = 2),
        StaticValueMockData(value = BigDecimal("1500"), countAdult = 2),
        StaticValueMockData(value = BigDecimal("1600"), countAdult = 2, countChild = 1),
        StaticValueMockData(value = BigDecimal("1700"), countAdult = 2, countChild = 2),
        StaticValueMockData(value = BigDecimal("1800"), countAdult = 2, countChild = 3),
    )

    private val mockFamilyAllowance = listOf(
        FamilyAllowanceMockData(value = BigDecimal("10"), age = 0),
        FamilyAllowanceMockData(value = BigDecimal("30"), age = 3),
        FamilyAllowanceMockData(value = BigDecimal("90"), age = 10),
        FamilyAllowanceMockData(value = BigDecimal("190"), age = 19),
    )

    private val mockSiblingAddition = listOf(
        SiblingAdditionMockData(value = BigDecimal("1"), countChild = 2),
        SiblingAdditionMockData(value = BigDecimal("2"), countChild = 3),
        SiblingAdditionMockData(value = BigDecimal("3"), countChild = 4),
        SiblingAdditionMockData(value = BigDecimal("4"), countChild = 5),
        SiblingAdditionMockData(value = BigDecimal("5"), countChild = 6),
        SiblingAdditionMockData(value = BigDecimal("6"), countChild = 7),
    )

    @MockK
    private lateinit var staticValueRepository: StaticValueRepository

    private lateinit var incomeValidatorService: IncomeValidatorService

    @BeforeEach
    fun beforeEach() {
        every { staticValueRepository.findAllValidAt(any()) } returns staticValues()

        incomeValidatorService = IncomeValidatorServiceImpl(staticValueRepository)
    }

    @Test
    fun `no data given`() {
        assertThrows<IllegalArgumentException> { incomeValidatorService.validate(listOf()) }
    }

    @Test
    fun `single person below limit`() {
        val persons = listOf(
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("500"),
                birthDate = LocalDate.now().minusYears(35),
            ),
        )

        val result = incomeValidatorService.validate(persons)

        assertThat(result.totalSum).isEqualTo(BigDecimal("500"))
        assertThat(result.limit).isEqualTo(BigDecimal("1000"))
        assertThat(result.amountExceededLimit).isEqualTo(BigDecimal.ZERO)
        assertThat(result.valid).isTrue
    }

    @Test
    fun `single person exactly on limit`() {
        val persons = listOf(
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("1000"),
                birthDate = LocalDate.now().minusYears(35),
            ),
        )

        val result = incomeValidatorService.validate(persons)

        assertThat(result.totalSum).isEqualTo(BigDecimal("1000"))
        assertThat(result.limit).isEqualTo(BigDecimal("1000"))
        assertThat(result.amountExceededLimit).isEqualTo(BigDecimal.ZERO)
        assertThat(result.valid).isTrue
    }

    @Test
    fun `single person above limit`() {
        val persons = listOf(
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("1150"),
                birthDate = LocalDate.now().minusYears(35),
            ),
        )

        val result = incomeValidatorService.validate(persons)

        assertThat(result.totalSum).isEqualTo(BigDecimal("1150"))
        assertThat(result.limit).isEqualTo(BigDecimal("1000"))
        assertThat(result.amountExceededLimit).isEqualTo(BigDecimal("150"))
        assertThat(result.valid).isFalse
    }

    @Test
    fun `single person above limit within tolerance`() {
        every { staticValueRepository.findAllValidAt(any()) } returns staticValues(tolerance = BigDecimal("100"))

        val persons = listOf(
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("1050"),
                birthDate = LocalDate.now().minusYears(35),
            ),
        )

        val result = incomeValidatorService.validate(persons)

        assertThat(result.totalSum).isEqualTo(BigDecimal("1050"))
        assertThat(result.limit).isEqualTo(BigDecimal("1100"))
        assertThat(result.amountExceededLimit).isEqualTo(BigDecimal.ZERO)
        assertThat(result.valid).isTrue
    }

    @Test
    fun `single person above limit exactly on tolerance`() {
        every { staticValueRepository.findAllValidAt(any()) } returns staticValues(tolerance = BigDecimal("100"))

        val persons = listOf(
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("1100"),
                birthDate = LocalDate.now().minusYears(35),
            ),
        )

        val result = incomeValidatorService.validate(persons)

        assertThat(result.totalSum).isEqualTo(BigDecimal("1100"))
        assertThat(result.limit).isEqualTo(BigDecimal("1100"))
        assertThat(result.amountExceededLimit).isEqualTo(BigDecimal.ZERO)
        assertThat(result.valid).isTrue
    }

    @Test
    fun `single person above limit without tolerance`() {
        val persons = listOf(
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("1050"),
                birthDate = LocalDate.now().minusYears(35),
            ),
        )

        val result = incomeValidatorService.validate(persons)

        assertThat(result.totalSum).isEqualTo(BigDecimal("1050"))
        assertThat(result.limit).isEqualTo(BigDecimal("1000"))
        assertThat(result.amountExceededLimit).isEqualTo(BigDecimal("50"))
        assertThat(result.valid).isFalse
    }

    @Test
    fun `two persons below limit`() {
        val persons = listOf(
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("700"),
                birthDate = LocalDate.now().minusYears(35),
            ),
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("700"),
                birthDate = LocalDate.now().minusYears(30),
            ),
        )

        val result = incomeValidatorService.validate(persons)

        assertThat(result.totalSum).isEqualTo(BigDecimal("1400"))
        assertThat(result.limit).isEqualTo(BigDecimal("1500"))
        assertThat(result.amountExceededLimit).isEqualTo(BigDecimal.ZERO)
        assertThat(result.valid).isTrue
    }

    @Test
    fun `two persons above limit`() {
        val persons = listOf(
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("1000"),
                birthDate = LocalDate.now().minusYears(35),
            ),
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("1000"),
                birthDate = LocalDate.now().minusYears(30),
            ),
        )

        val result = incomeValidatorService.validate(persons)

        assertThat(result.totalSum).isEqualTo(BigDecimal("2000"))
        assertThat(result.limit).isEqualTo(BigDecimal("1500"))
        assertThat(result.amountExceededLimit).isEqualTo(BigDecimal("500"))
        assertThat(result.valid).isFalse
    }

    @Test
    fun `three persons below limit`() {
        val persons = listOf(
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("250"),
                birthDate = LocalDate.now().minusYears(35),
            ),
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("250"),
                birthDate = LocalDate.now().minusYears(30),
            ),
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("250"),
                birthDate = LocalDate.now().minusYears(30),
            ),
        )

        val result = incomeValidatorService.validate(persons)

        assertThat(result.totalSum).isEqualTo(BigDecimal("750"))
        assertThat(result.limit).isEqualTo(BigDecimal("1700"))
        assertThat(result.amountExceededLimit).isEqualTo(BigDecimal.ZERO)
        assertThat(result.valid).isTrue
    }

    @Test
    fun `three persons above limit`() {
        val persons = listOf(
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("600"),
                birthDate = LocalDate.now().minusYears(35),
            ),
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("600"),
                birthDate = LocalDate.now().minusYears(30),
            ),
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("650"),
                birthDate = LocalDate.now().minusYears(30),
            ),
        )

        val result = incomeValidatorService.validate(persons)

        assertThat(result.totalSum).isEqualTo(BigDecimal("1850"))
        assertThat(result.limit).isEqualTo(BigDecimal("1700"))
        assertThat(result.amountExceededLimit).isEqualTo(BigDecimal("150"))
        assertThat(result.valid).isFalse
    }

    @Test
    fun `three persons matching limit`() {
        val persons = listOf(
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("750"),
                birthDate = LocalDate.now().minusYears(35),
            ),
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("750"),
                birthDate = LocalDate.now().minusYears(30),
            ),
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("200"),
                birthDate = LocalDate.now().minusYears(30),
            ),
        )

        val result = incomeValidatorService.validate(persons)

        assertThat(result.totalSum).isEqualTo(BigDecimal("1700"))
        assertThat(result.limit).isEqualTo(BigDecimal("1700"))
        assertThat(result.amountExceededLimit).isEqualTo(BigDecimal.ZERO)
        assertThat(result.valid).isTrue
    }

    @Test
    fun `family below limit`() {
        val persons = listOf(
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("500"),
                birthDate = LocalDate.now().minusYears(35),
            ),
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("500"),
                birthDate = LocalDate.now().minusYears(30),
            ),
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(10),
                receivesFamilyAllowance = true,
            ),
        )

        val result = incomeValidatorService.validate(persons)

        assertThat(result.totalSum).isEqualTo(BigDecimal("1205"))
        assertThat(result.limit).isEqualTo(BigDecimal("1600"))
        assertThat(result.amountExceededLimit).isEqualTo(BigDecimal.ZERO)
        assertThat(result.valid).isTrue
    }

    @Test
    fun `family matching limit`() {
        val persons = listOf(
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("1000"),
                birthDate = LocalDate.now().minusYears(35),
            ),
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("395"),
                birthDate = LocalDate.now().minusYears(30),
            ),
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(10),
                receivesFamilyAllowance = true,
            ),
        )

        val result = incomeValidatorService.validate(persons)

        assertThat(result.totalSum).isEqualTo(BigDecimal("1600"))
        assertThat(result.limit).isEqualTo(BigDecimal("1600"))
        assertThat(result.amountExceededLimit).isEqualTo(BigDecimal.ZERO)
        assertThat(result.valid).isTrue
    }

    @Test
    fun `family above limit`() {
        val persons = listOf(
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("1000"),
                birthDate = LocalDate.now().minusYears(35),
            ),
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("600"),
                birthDate = LocalDate.now().minusYears(30),
            ),
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(10),
                receivesFamilyAllowance = true,
            ),
        )

        val result = incomeValidatorService.validate(persons)

        assertThat(result.totalSum).isEqualTo(BigDecimal("1805"))
        assertThat(result.limit).isEqualTo(BigDecimal("1600"))
        assertThat(result.amountExceededLimit).isEqualTo(BigDecimal("205"))
        assertThat(result.valid).isFalse
    }

    @Test
    fun `family with 8 children matching limit`() {
        val persons = listOf(
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("992"),
                birthDate = LocalDate.now().minusYears(35),
            ),
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(30),
            ),
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(0),
                receivesFamilyAllowance = true,
            ),
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(3),
                receivesFamilyAllowance = true,
            ),
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(10),
                receivesFamilyAllowance = true,
            ),
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(19),
                receivesFamilyAllowance = true,
            ),
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(24),
                receivesFamilyAllowance = true,
            ),
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(4),
                receivesFamilyAllowance = true,
            ),
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(12),
                receivesFamilyAllowance = true,
            ),
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(20),
                receivesFamilyAllowance = true,
            ),
        )

        val result = incomeValidatorService.validate(persons)

        assertThat(result.totalSum).isEqualTo(BigDecimal("2300"))
        assertThat(result.limit).isEqualTo(BigDecimal("2600"))
        assertThat(result.amountExceededLimit).isEqualTo(BigDecimal.ZERO)
        assertThat(result.valid).isTrue
    }

    @Test
    fun `two persons below limit cause one is excluded from calculation`() {
        val persons = listOf(
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("1000"),
                birthDate = LocalDate.now().minusYears(35),
            ),
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("1000"),
                birthDate = LocalDate.now().minusYears(30),
                excludeFromIncomeCalculation = true,
            ),
        )

        val result = incomeValidatorService.validate(persons)

        assertThat(result.totalSum).isEqualTo(BigDecimal("1000"))
        assertThat(result.limit).isEqualTo(BigDecimal("1000"))
        assertThat(result.amountExceededLimit).isEqualTo(BigDecimal.ZERO)
        assertThat(result.valid).isTrue()
    }

    @Test
    fun `validating many households reads the static values once`() {
        val households = listOf(
            listOf(
                IncomeValidatorPerson(
                    monthlyIncome = BigDecimal("500"),
                    birthDate = LocalDate.now().minusYears(35),
                ),
            ),
            listOf(
                IncomeValidatorPerson(
                    monthlyIncome = BigDecimal("1150"),
                    birthDate = LocalDate.now().minusYears(35),
                ),
            ),
        )

        val results = incomeValidatorService.validateAll(households)

        assertThat(results).hasSize(2)
        assertThat(results[0].valid).isTrue
        assertThat(results[1].valid).isFalse
        assertThat(results[1].amountExceededLimit).isEqualTo(BigDecimal("150"))
        verify(exactly = 1) { staticValueRepository.findAllValidAt(any()) }
    }

    @Test
    fun `unconfigured static values are treated as zero`() {
        every { staticValueRepository.findAllValidAt(any()) } returns emptyList()

        val persons = listOf(
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("500"),
                birthDate = LocalDate.now().minusYears(35),
            ),
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(10),
                receivesFamilyAllowance = true,
            ),
        )

        val result = incomeValidatorService.validate(persons)

        assertThat(result.totalSum).isEqualTo(BigDecimal("500"))
        assertThat(result.limit).isEqualTo(BigDecimal.ZERO)
        assertThat(result.toleranceValue).isEqualTo(BigDecimal.ZERO)
        assertThat(result.amountExceededLimit).isEqualTo(BigDecimal("500"))
        assertThat(result.valid).isFalse
    }

    private fun staticValues(tolerance: BigDecimal? = null): List<StaticValueEntity> {
        val incomeLimits = mockIncomeLimits.map { mockData ->
            staticValue(StaticValueType.INCOME_LIMIT, mockData.value).apply {
                countAdults = mockData.countAdult
                countChildren = mockData.countChild
            }
        }
        val familyAllowances = mockFamilyAllowance.map { mockData ->
            staticValue(StaticValueType.FAMILY_ALLOWANCE, mockData.value).apply {
                age = mockData.age
            }
        }
        val siblingAdditions = mockSiblingAddition.map { mockData ->
            staticValue(StaticValueType.SIBLING_ADDITION, mockData.value).apply {
                countChildren = mockData.countChild
            }
        }

        return incomeLimits + familyAllowances + siblingAdditions + listOfNotNull(
            staticValue(StaticValueType.ADDITIONAL_ADULT, BigDecimal("200")),
            staticValue(StaticValueType.ADDITIONAL_CHILD, BigDecimal("100")),
            staticValue(StaticValueType.CHILD_TAX_ALLOWANCE, BigDecimal("15")),
            tolerance?.let { staticValue(StaticValueType.TOLERANCE, it) },
        )
    }

    private fun staticValue(type: StaticValueType, amount: BigDecimal): StaticValueEntity = StaticValueEntity(
        validFrom = LocalDate.now(),
        validTo = LocalDate.now(),
        type = type,
        amount = amount,
    )
}

data class StaticValueMockData(
    val value: BigDecimal,
    val countAdult: Int,
    val countChild: Int? = 0,
)

data class FamilyAllowanceMockData(
    val value: BigDecimal,
    val age: Int,
)

data class SiblingAdditionMockData(
    val value: BigDecimal,
    val countChild: Int,
)
