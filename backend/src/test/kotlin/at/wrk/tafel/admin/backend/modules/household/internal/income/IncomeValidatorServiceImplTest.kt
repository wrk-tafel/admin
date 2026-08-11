package at.wrk.tafel.admin.backend.modules.household.internal.income

import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueRepository
import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueType
import io.mockk.every
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
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

    @RelaxedMockK
    private lateinit var staticValueRepository: StaticValueRepository

    private lateinit var incomeTolerance100Entity: StaticValueEntity

    private lateinit var incomeValidatorService: IncomeValidatorService

    @BeforeEach
    fun beforeEach() {
        every {
            staticValueRepository.findLatestForPersonCount(
                currentDate = any(),
                countAdults = any(),
                countChildren = any(),
            )
        } answers {
            val countAdult = arg<Int>(2)
            val countChild = arg<Int>(3)
            mockIncomeLimits
                .filter { it.countAdult == countAdult }
                .filter { it.countChild == countChild }
                .map { createStaticValueEntity(it.value) }
                .first()
        }
        every { staticValueRepository.findSingleValueOfType(type = StaticValueType.ADDITIONAL_ADULT, currentDate = any()) } returns createAdditionalAdultLimitEntity()
        every { staticValueRepository.findSingleValueOfType(type = StaticValueType.ADDITIONAL_CHILD, currentDate = any()) } returns createAdditionalChildLimitEntity()
        every { staticValueRepository.findValuesOfType(type = StaticValueType.FAMILY_ALLOWANCE, currentDate = any()) } returns mockFamilyAllowance.map {
            newStaticValueEntity(it.value).apply {
                age = it.age
            }
        }

        incomeTolerance100Entity = newStaticValueEntity(BigDecimal("100"))
        every { staticValueRepository.findSingleValueOfType(type = StaticValueType.TOLERANCE, currentDate = any()) } returns null

        val childTaxAllowanceEntity = newStaticValueEntity(BigDecimal("15"))
        every { staticValueRepository.findSingleValueOfType(type = StaticValueType.CHILD_TAX_ALLOWANCE, currentDate = any()) } returns childTaxAllowanceEntity

        every {
            staticValueRepository.findValuesOfType(type = StaticValueType.SIBLING_ADDITION, currentDate = any())
        } returns mockSiblingAddition.map {
            newStaticValueEntity(it.value).apply {
                countChildren = it.countChild
            }
        }

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
        every { staticValueRepository.findSingleValueOfType(type = StaticValueType.TOLERANCE, currentDate = any()) } returns incomeTolerance100Entity

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
        every { staticValueRepository.findSingleValueOfType(type = StaticValueType.TOLERANCE, currentDate = any()) } returns incomeTolerance100Entity

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

        // 500 + 500 + the age-10 tier (90) + the flat child tax allowance (15)
        assertThat(result.totalSum).isEqualTo(BigDecimal("1105"))
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
                monthlyIncome = BigDecimal("495"),
                birthDate = LocalDate.now().minusYears(30),
            ),
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(10),
                receivesFamilyAllowance = true,
            ),
        )

        val result = incomeValidatorService.validate(persons)

        // 1000 + 495 + the age-10 tier (90) + the flat child tax allowance (15)
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

        // 1000 + 600 + the age-10 tier (90) + the flat child tax allowance (15)
        assertThat(result.totalSum).isEqualTo(BigDecimal("1705"))
        assertThat(result.limit).isEqualTo(BigDecimal("1600"))
        assertThat(result.amountExceededLimit).isEqualTo(BigDecimal("105"))
        assertThat(result.valid).isFalse
    }

    @Test
    fun `family with 8 children matching limit`() {
        val persons = listOf(
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("1612"),
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

        // 1612 + the per-child tiers for ages 0/3/10/19/24/4/12/20 (10 + 30 + 90 + 190 + 190 + 30 +
        // 90 + 190 = 820) + 8x the flat child tax allowance (120) + the capped sibling addition (6
        // per child for 8 children = 48)
        assertThat(result.totalSum).isEqualTo(BigDecimal("2600"))
        assertThat(result.limit).isEqualTo(BigDecimal("2600"))
        assertThat(result.amountExceededLimit).isEqualTo(BigDecimal.ZERO)
        assertThat(result.valid).isTrue
    }

    @Test
    fun `family allowance per child is the highest tier the child's age has reached`() {
        val persons = listOf(
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("500"),
                birthDate = LocalDate.now().minusYears(35),
            ),
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(2),
                receivesFamilyAllowance = true,
            ),
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(3),
                receivesFamilyAllowance = true,
            ),
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(9),
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
        )

        val result = incomeValidatorService.validate(persons)

        // 500 + the tiers reached at ages 2/3/9/19/24 (10 + 30 + 30 + 190 + 190 = 450) + 5x the flat
        // child tax allowance (75) + the sibling addition for 5 children (4 each = 20)
        assertThat(result.totalSum).isEqualTo(BigDecimal("1045"))
    }

    @Test
    fun `child younger than the lowest configured tier receives no family allowance`() {
        every { staticValueRepository.findValuesOfType(type = StaticValueType.FAMILY_ALLOWANCE, currentDate = any()) } returns
            mockFamilyAllowance.filter { it.age >= 3 }.map {
                newStaticValueEntity(it.value).apply {
                    age = it.age
                }
            }

        val persons = listOf(
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("1000"),
                birthDate = LocalDate.now().minusYears(35),
            ),
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(1),
                receivesFamilyAllowance = true,
            ),
        )

        val result = incomeValidatorService.validate(persons)

        // 1000 + no tier covers a 1-year-old + the flat child tax allowance (15)
        assertThat(result.totalSum).isEqualTo(BigDecimal("1015"))
        assertThat(result.limit).isEqualTo(BigDecimal("1100"))
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

    private fun newStaticValueEntity(amount: BigDecimal): StaticValueEntity = StaticValueEntity(
        validFrom = LocalDate.now(),
        validTo = LocalDate.now(),
        type = StaticValueType.TOLERANCE,
        amount = amount,
    )

    private fun createStaticValueEntity(value: BigDecimal): StaticValueEntity = newStaticValueEntity(value)

    private fun createAdditionalAdultLimitEntity(): StaticValueEntity = newStaticValueEntity(BigDecimal("200"))

    private fun createAdditionalChildLimitEntity(): StaticValueEntity = newStaticValueEntity(BigDecimal("100"))
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
