package at.wrk.tafel.admin.backend.modules.household.internal.income

import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueRepository
import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueType
import at.wrk.tafel.admin.backend.modules.base.exception.BusinessRuleException
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
        every { staticValueRepository.findAllValidAt(any()) } returns
            staticValues().filterNot { it.type == StaticValueType.FAMILY_ALLOWANCE && (it.age ?: 0) < 3 }

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
    fun `details report every part the two totals were added up from`() {
        val persons = listOf(
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("500"),
                birthDate = LocalDate.now().minusYears(35),
            ),
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("300"),
                birthDate = LocalDate.now().minusYears(30),
            ),
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(28),
            ),
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(2),
                receivesFamilyAllowance = true,
            ),
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(5),
                receivesFamilyAllowance = true,
            ),
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(8),
                receivesFamilyAllowance = true,
            ),
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(12),
                receivesFamilyAllowance = true,
            ),
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(14),
                receivesFamilyAllowance = true,
            ),
        )

        val result = incomeValidatorService.validate(persons)

        val details = result.details
        assertThat(details.incomeSum).isEqualTo(BigDecimal("800"))
        // the tiers reached at ages 2/5/8/12/14: 10 + 30 + 30 + 90 + 90
        assertThat(details.familyAllowanceSum).isEqualTo(BigDecimal("250"))
        assertThat(details.childTaxAllowanceSum).isEqualTo(BigDecimal("75"))
        // 5 children, so 4 each
        assertThat(details.siblingAdditionSum).isEqualTo(BigDecimal("20"))

        // 3 adults and 5 children, of which the base limit covers 2 and 3
        assertThat(details.baseLimit).isEqualTo(BigDecimal("1800"))
        assertThat(details.baseLimitCountAdults).isEqualTo(2)
        assertThat(details.baseLimitCountChildren).isEqualTo(3)
        assertThat(details.additionalAdultsCount).isEqualTo(1)
        assertThat(details.additionalAdultsSum).isEqualTo(BigDecimal("200"))
        assertThat(details.additionalChildrenCount).isEqualTo(2)
        assertThat(details.additionalChildrenSum).isEqualTo(BigDecimal("200"))

        // the parts are exactly the two totals, split up
        assertThat(
            details.incomeSum + details.familyAllowanceSum + details.childTaxAllowanceSum + details.siblingAdditionSum,
        ).isEqualTo(result.totalSum)
        assertThat(
            details.baseLimit + details.additionalAdultsSum + details.additionalChildrenSum + result.toleranceValue,
        ).isEqualTo(result.limit)
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
    fun `person excluded from the calculation contributes no family allowance either`() {
        val persons = listOf(
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("500"),
                birthDate = LocalDate.now().minusYears(35),
            ),
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(12),
                receivesFamilyAllowance = true,
                excludeFromIncomeCalculation = true,
            ),
        )

        val result = incomeValidatorService.validate(persons)

        val details = result.details
        assertThat(details.incomeSum).isEqualTo(BigDecimal("500"))
        assertThat(details.familyAllowanceSum).isEqualTo(BigDecimal.ZERO)
        assertThat(details.childTaxAllowanceSum).isEqualTo(BigDecimal.ZERO)
        assertThat(details.siblingAdditionSum).isEqualTo(BigDecimal.ZERO)
        assertThat(result.totalSum).isEqualTo(BigDecimal("500"))
        // the excluded child raises neither the income nor the limit
        assertThat(result.limit).isEqualTo(BigDecimal("1000"))
        assertThat(result.valid).isTrue
    }

    @Test
    fun `excluded children do not count towards the sibling addition of the household's children`() {
        val persons = listOf(
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("500"),
                birthDate = LocalDate.now().minusYears(35),
            ),
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(10),
                receivesFamilyAllowance = true,
            ),
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(10),
                receivesFamilyAllowance = true,
            ),
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(10),
                receivesFamilyAllowance = true,
                excludeFromIncomeCalculation = true,
            ),
        )

        val result = incomeValidatorService.validate(persons)

        val details = result.details
        // only the two children in the household: 2x the age-10 tier (180), 2x the flat child tax
        // allowance (30) and the 2-children sibling addition (1 each) - not the 3-children one
        assertThat(details.familyAllowanceSum).isEqualTo(BigDecimal("180"))
        assertThat(details.childTaxAllowanceSum).isEqualTo(BigDecimal("30"))
        assertThat(details.siblingAdditionSum).isEqualTo(BigDecimal("2"))
        assertThat(result.totalSum).isEqualTo(BigDecimal("712"))
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
        assertThat(results[0].getOrThrow().valid).isTrue
        assertThat(results[1].getOrThrow().valid).isFalse
        assertThat(results[1].getOrThrow().amountExceededLimit).isEqualTo(BigDecimal("150"))
        verify(exactly = 1) { staticValueRepository.findAllValidAt(any()) }
    }

    @Test
    fun `a household that cannot be validated fails on its own without aborting the batch`() {
        val households = listOf(
            listOf(
                IncomeValidatorPerson(
                    monthlyIncome = BigDecimal("500"),
                    birthDate = LocalDate.now().minusYears(35),
                ),
            ),
            // nobody in this household is an adult, so no configured limit covers it
            listOf(
                IncomeValidatorPerson(
                    birthDate = LocalDate.now().minusYears(10),
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

        assertThat(results).hasSize(3)
        assertThat(results[0].getOrThrow().valid).isTrue
        assertThat(results[1].exceptionOrNull()).isInstanceOf(BusinessRuleException::class.java)
        assertThat(results[2].getOrThrow().valid).isFalse
    }

    @Test
    fun `unconfigured allowances are treated as zero`() {
        every { staticValueRepository.findAllValidAt(any()) } returns
            staticValues().filter { it.type == StaticValueType.INCOME_LIMIT }

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

        // no family allowance, child tax allowance, sibling addition or tolerance is configured, so
        // none of them adds anything
        assertThat(result.totalSum).isEqualTo(BigDecimal("500"))
        assertThat(result.limit).isEqualTo(BigDecimal("1100"))
        assertThat(result.toleranceValue).isEqualTo(BigDecimal.ZERO)
        assertThat(result.amountExceededLimit).isEqualTo(BigDecimal.ZERO)
        assertThat(result.valid).isTrue
    }

    @Test
    fun `a lapsed or missing income limit configuration is rejected instead of read as a limit of zero`() {
        every { staticValueRepository.findAllValidAt(any()) } returns
            staticValues().filterNot { it.type == StaticValueType.INCOME_LIMIT }

        // an ordinary single-adult household - what is missing is the configuration, as it would be
        // when an INCOME_LIMIT row is deleted or its validity window has lapsed
        val persons = listOf(
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("500"),
                birthDate = LocalDate.now().minusYears(35),
            ),
        )

        val exception = assertThrows<BusinessRuleException> { incomeValidatorService.validate(persons) }

        assertThat(exception.message)
            .contains("Kein Einkommenslimit für diese Haushaltszusammensetzung konfiguriert (Erwachsene: 1, Kinder: 0)!")
    }

    @Test
    fun `household without any adult is rejected - no limit is configured for that composition`() {
        val persons = listOf(
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(10),
                receivesFamilyAllowance = true,
            ),
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(8),
                receivesFamilyAllowance = true,
            ),
        )

        val exception = assertThrows<BusinessRuleException> { incomeValidatorService.validate(persons) }

        assertThat(exception.message)
            .contains("Kein Einkommenslimit für diese Haushaltszusammensetzung konfiguriert (Erwachsene: 0, Kinder: 2)!")
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
