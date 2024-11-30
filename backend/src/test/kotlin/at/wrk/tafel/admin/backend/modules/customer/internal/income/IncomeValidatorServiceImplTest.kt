package at.wrk.tafel.admin.backend.modules.customer.internal.income

import at.wrk.tafel.admin.backend.database.model.staticdata.ChildTaxAllowanceEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.FamilyBonusEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.IncomeLimitEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.IncomeToleranceEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.SiblingAdditionEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.ChildTaxAllowanceRepository
import at.wrk.tafel.admin.backend.database.model.staticdata.FamilyBonusRepository
import at.wrk.tafel.admin.backend.database.model.staticdata.IncomeLimitRepository
import at.wrk.tafel.admin.backend.database.model.staticdata.IncomeToleranceRepository
import at.wrk.tafel.admin.backend.database.model.staticdata.SiblingAdditionRepository
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
import java.util.*

@ExtendWith(MockKExtension::class)
class IncomeValidatorServiceImplTest {

    private val MOCK_INCOME_LIMITS = listOf(
        IncomeLimitMockData(value = BigDecimal("1000"), countAdult = 1),
        IncomeLimitMockData(value = BigDecimal("1100"), countAdult = 1, countChild = 1),
        IncomeLimitMockData(value = BigDecimal("1200"), countAdult = 1, countChild = 2),
        IncomeLimitMockData(value = BigDecimal("1500"), countAdult = 2),
        IncomeLimitMockData(value = BigDecimal("1600"), countAdult = 2, countChild = 1),
        IncomeLimitMockData(value = BigDecimal("1700"), countAdult = 2, countChild = 2),
        IncomeLimitMockData(value = BigDecimal("1800"), countAdult = 2, countChild = 3)
    )

    private val MOCK_FAMILY_BONUS = listOf(
        FamilyBonusMockData(value = BigDecimal("10"), age = 0),
        FamilyBonusMockData(value = BigDecimal("30"), age = 3),
        FamilyBonusMockData(value = BigDecimal("90"), age = 10),
        FamilyBonusMockData(value = BigDecimal("190"), age = 19)
    )

    private val MOCK_SIBLING_ADDITION = listOf(
        SiblingAdditionMockData(value = BigDecimal("1"), countChild = 2),
        SiblingAdditionMockData(value = BigDecimal("2"), countChild = 3),
        SiblingAdditionMockData(value = BigDecimal("3"), countChild = 4),
        SiblingAdditionMockData(value = BigDecimal("4"), countChild = 5),
        SiblingAdditionMockData(value = BigDecimal("5"), countChild = 6),
        SiblingAdditionMockData(value = BigDecimal("6"), countChild = 7)
    )

    @RelaxedMockK
    private lateinit var incomeLimitRepository: IncomeLimitRepository

    @RelaxedMockK
    private lateinit var incomeToleranceRepository: IncomeToleranceRepository

    @RelaxedMockK
    private lateinit var familyBonusRepository: FamilyBonusRepository

    @RelaxedMockK
    private lateinit var childTaxAllowanceRepository: ChildTaxAllowanceRepository

    @RelaxedMockK
    private lateinit var siblingAdditionRepository: SiblingAdditionRepository

    private lateinit var incomeValidatorService: IncomeValidatorService

    private lateinit var incomeTolerance100Entity: IncomeToleranceEntity

    @BeforeEach
    fun beforeEach() {
        every {
            incomeLimitRepository.findLatestForPersonCount(
                any(),
                any(),
                any()
            )
        } answers {
            val countAdult = secondArg<Int>()
            val countChild = thirdArg<Int>()
            MOCK_INCOME_LIMITS
                .filter { it.countAdult == countAdult }
                .filter { it.countChild == countChild }
                .map { createIncomeLimitEntity(it.value) }
                .first()
        }
        every { incomeLimitRepository.findLatestAdditionalAdult(any()) } returns createAdditionalAdultLimitEntity()
        every { incomeLimitRepository.findLatestAdditionalChild(any()) } returns createAdditionalChildLimitEntity()
        every { familyBonusRepository.findCurrentValues(any()) } returns MOCK_FAMILY_BONUS.map {
            val entity = FamilyBonusEntity()
            entity.amount = it.value
            entity.age = it.age
            entity
        }

        incomeTolerance100Entity = IncomeToleranceEntity()
        incomeTolerance100Entity.amount = BigDecimal("100")
        every { incomeToleranceRepository.findCurrentValue(any()) } returns Optional.empty()

        val childTaxAllowanceEntity = ChildTaxAllowanceEntity()
        childTaxAllowanceEntity.amount = BigDecimal("15")
        every { childTaxAllowanceRepository.findCurrentValue(any()) } returns Optional.of(childTaxAllowanceEntity)

        every {
            siblingAdditionRepository.findCurrentValues(any())
        } returns MOCK_SIBLING_ADDITION.map {
            var siblingAdditionEntity = SiblingAdditionEntity()
            siblingAdditionEntity.amount = it.value
            siblingAdditionEntity.countChild = it.countChild
            siblingAdditionEntity
        }

        every {
            siblingAdditionRepository.findCurrentMaxAddition(any())
        } answers {
            val mockAddition = MOCK_SIBLING_ADDITION.last()
            var siblingAdditionEntity = SiblingAdditionEntity()
            siblingAdditionEntity.amount = mockAddition.value
            siblingAdditionEntity.countChild = mockAddition.countChild
            Optional.of(siblingAdditionEntity)
        }

        incomeValidatorService =
            IncomeValidatorServiceImpl(
                incomeLimitRepository,
                incomeToleranceRepository,
                familyBonusRepository,
                childTaxAllowanceRepository,
                siblingAdditionRepository
            )
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
                birthDate = LocalDate.now().minusYears(35)
            )
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
                birthDate = LocalDate.now().minusYears(35)
            )
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
                birthDate = LocalDate.now().minusYears(35)
            )
        )

        val result = incomeValidatorService.validate(persons)

        assertThat(result.totalSum).isEqualTo(BigDecimal("1150"))
        assertThat(result.limit).isEqualTo(BigDecimal("1000"))
        assertThat(result.amountExceededLimit).isEqualTo(BigDecimal("150"))
        assertThat(result.valid).isFalse
    }

    @Test
    fun `single person above limit within tolerance`() {
        every { incomeToleranceRepository.findCurrentValue(any()) } returns Optional.of(incomeTolerance100Entity)

        val persons = listOf(
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("1050"),
                birthDate = LocalDate.now().minusYears(35)
            )
        )

        val result = incomeValidatorService.validate(persons)

        assertThat(result.totalSum).isEqualTo(BigDecimal("1050"))
        assertThat(result.limit).isEqualTo(BigDecimal("1100"))
        assertThat(result.amountExceededLimit).isEqualTo(BigDecimal.ZERO)
        assertThat(result.valid).isTrue
    }

    @Test
    fun `single person above limit exactly on tolerance`() {
        every { incomeToleranceRepository.findCurrentValue(any()) } returns Optional.of(incomeTolerance100Entity)

        val persons = listOf(
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("1100"),
                birthDate = LocalDate.now().minusYears(35)
            )
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
                birthDate = LocalDate.now().minusYears(35)
            )
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
                birthDate = LocalDate.now().minusYears(35)
            ),
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("700"),
                birthDate = LocalDate.now().minusYears(30)
            )
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
                birthDate = LocalDate.now().minusYears(35)
            ),
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("1000"),
                birthDate = LocalDate.now().minusYears(30)
            )
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
                birthDate = LocalDate.now().minusYears(35)
            ),
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("250"),
                birthDate = LocalDate.now().minusYears(30)
            ),
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("250"),
                birthDate = LocalDate.now().minusYears(30)
            )
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
                birthDate = LocalDate.now().minusYears(35)
            ),
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("600"),
                birthDate = LocalDate.now().minusYears(30)
            ),
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("650"),
                birthDate = LocalDate.now().minusYears(30)
            )
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
                birthDate = LocalDate.now().minusYears(35)
            ),
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("750"),
                birthDate = LocalDate.now().minusYears(30)
            ),
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("200"),
                birthDate = LocalDate.now().minusYears(30)
            )
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
                birthDate = LocalDate.now().minusYears(35)
            ),
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("500"),
                birthDate = LocalDate.now().minusYears(30)
            ),
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(10),
                receivesFamilyBonus = true
            )
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
                birthDate = LocalDate.now().minusYears(35)
            ),
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("395"),
                birthDate = LocalDate.now().minusYears(30)
            ),
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(10),
                receivesFamilyBonus = true
            )
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
                birthDate = LocalDate.now().minusYears(35)
            ),
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("600"),
                birthDate = LocalDate.now().minusYears(30)
            ),
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(10),
                receivesFamilyBonus = true
            )
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
                birthDate = LocalDate.now().minusYears(35)
            ),
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(30)
            ),
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(0),
                receivesFamilyBonus = true
            ),
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(3),
                receivesFamilyBonus = true
            ),
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(10),
                receivesFamilyBonus = true
            ),
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(19),
                receivesFamilyBonus = true
            ),
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(24),
                receivesFamilyBonus = true
            ),
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(4),
                receivesFamilyBonus = true
            ),
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(12),
                receivesFamilyBonus = true
            ),
            IncomeValidatorPerson(
                birthDate = LocalDate.now().minusYears(20),
                receivesFamilyBonus = true
            )
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
                birthDate = LocalDate.now().minusYears(35)
            ),
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("1000"),
                birthDate = LocalDate.now().minusYears(30),
                excludeFromIncomeCalculation = true
            )
        )

        val result = incomeValidatorService.validate(persons)

        assertThat(result.totalSum).isEqualTo(BigDecimal("1000"))
        assertThat(result.limit).isEqualTo(BigDecimal("1000"))
        assertThat(result.amountExceededLimit).isEqualTo(BigDecimal.ZERO)
        assertThat(result.valid).isTrue()
    }

    private fun createIncomeLimitEntity(value: BigDecimal): IncomeLimitEntity {
        val entity = IncomeLimitEntity()
        entity.amount = value
        return entity
    }

    private fun createAdditionalAdultLimitEntity(): IncomeLimitEntity {
        val entity = IncomeLimitEntity()
        entity.amount = BigDecimal("200")
        return entity
    }

    private fun createAdditionalChildLimitEntity(): IncomeLimitEntity {
        val entity = IncomeLimitEntity()
        entity.amount = BigDecimal("100")
        return entity
    }
}

data class IncomeLimitMockData(
    val value: BigDecimal,
    val countAdult: Int,
    val countChild: Int? = 0
)

data class FamilyBonusMockData(
    val value: BigDecimal,
    val age: Int
)

data class SiblingAdditionMockData(
    val value: BigDecimal,
    val countChild: Int
)
