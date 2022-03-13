package at.wrk.tafel.admin.backend.modules.customer.income

import at.wrk.tafel.admin.backend.dbmodel.entities.staticvalues.ChildTaxAllowanceEntity
import at.wrk.tafel.admin.backend.dbmodel.entities.staticvalues.FamilyBonusEntity
import at.wrk.tafel.admin.backend.dbmodel.entities.staticvalues.IncomeLimitEntity
import at.wrk.tafel.admin.backend.dbmodel.entities.staticvalues.IncomeToleranceEntity
import at.wrk.tafel.admin.backend.dbmodel.repositories.ChildTaxAllowanceRepository
import at.wrk.tafel.admin.backend.dbmodel.repositories.FamilyBonusRepository
import at.wrk.tafel.admin.backend.dbmodel.repositories.IncomeLimitRepository
import at.wrk.tafel.admin.backend.dbmodel.repositories.IncomeToleranceRepository
import io.mockk.every
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import java.math.BigDecimal
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

    @RelaxedMockK
    private lateinit var incomeLimitRepository: IncomeLimitRepository

    @RelaxedMockK
    private lateinit var incomeToleranceRepository: IncomeToleranceRepository

    @RelaxedMockK
    private lateinit var familyBonusRepository: FamilyBonusRepository

    @RelaxedMockK
    private lateinit var childTaxAllowanceRepository: ChildTaxAllowanceRepository

    private lateinit var incomeValidatorService: IncomeValidatorService

    private lateinit var incomeTolerance100Entity: IncomeToleranceEntity

    @BeforeEach
    fun beforeEach() {
        every {
            incomeLimitRepository.findLatestForPersonCount(
                any(),
                any()
            )
        } answers {
            val countAdult = firstArg<Int>()
            val countChild = secondArg<Int>()
            MOCK_INCOME_LIMITS
                .filter { it.countAdult == countAdult }
                .filter { it.countChild == countChild }
                .map { createIncomeLimitEntity(it.value) }
                .first()
        }
        every { incomeLimitRepository.findLatestAdditionalAdult() } returns createAdditionalAdultLimitEntity()
        every { incomeLimitRepository.findLatestAdditionalChild() } returns createAdditionalChildLimitEntity()
        every { familyBonusRepository.findAll() } returns MOCK_FAMILY_BONUS.map {
            val entity = FamilyBonusEntity()
            entity.value = it.value
            entity.age = it.age
            entity
        }

        incomeTolerance100Entity = IncomeToleranceEntity()
        incomeTolerance100Entity.value = BigDecimal("100")
        every { incomeToleranceRepository.findCurrentValue() } returns Optional.empty()

        val childTaxAllowanceEntity = ChildTaxAllowanceEntity()
        childTaxAllowanceEntity.value = BigDecimal("15")
        every { childTaxAllowanceRepository.findCurrentValue() } returns Optional.of(childTaxAllowanceEntity)

        incomeValidatorService =
            IncomeValidatorServiceImpl(
                incomeLimitRepository,
                incomeToleranceRepository,
                familyBonusRepository,
                childTaxAllowanceRepository
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
                age = 35
            )
        )

        val result = incomeValidatorService.validate(persons)

        assertThat(result.valid).isTrue
        assertThat(result.totalSum).isEqualTo(BigDecimal("500"))
        assertThat(result.amountExceededLimit).isEqualTo(BigDecimal.ZERO)
    }

    @Test
    fun `single person exactly on limit`() {
        val persons = listOf(
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("1000"),
                age = 35
            )
        )

        val result = incomeValidatorService.validate(persons)

        assertThat(result.valid).isTrue
        assertThat(result.totalSum).isEqualTo(BigDecimal("1000"))
        assertThat(result.amountExceededLimit).isEqualTo(BigDecimal.ZERO)
    }

    @Test
    fun `single person above limit`() {
        val persons = listOf(
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("1150"),
                age = 35
            )
        )

        val result = incomeValidatorService.validate(persons)

        assertThat(result.valid).isFalse
        assertThat(result.totalSum).isEqualTo(BigDecimal("1150"))
        assertThat(result.amountExceededLimit).isEqualTo(BigDecimal("-150"))
    }

    @Test
    fun `single person above limit within tolerance`() {
        every { incomeToleranceRepository.findCurrentValue() } returns Optional.of(incomeTolerance100Entity)

        val persons = listOf(
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("1050"),
                age = 35
            )
        )

        val result = incomeValidatorService.validate(persons)

        assertThat(result.valid).isTrue
        assertThat(result.totalSum).isEqualTo(BigDecimal("1050"))
        assertThat(result.amountExceededLimit).isEqualTo(BigDecimal.ZERO)
    }

    @Test
    fun `single person above limit exactly on tolerance`() {
        every { incomeToleranceRepository.findCurrentValue() } returns Optional.of(incomeTolerance100Entity)

        val persons = listOf(
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("1100"),
                age = 35
            )
        )

        val result = incomeValidatorService.validate(persons)

        assertThat(result.valid).isTrue
        assertThat(result.totalSum).isEqualTo(BigDecimal("1100"))
        assertThat(result.amountExceededLimit).isEqualTo(BigDecimal.ZERO)
    }

    @Test
    fun `single person above limit without tolerance`() {
        val persons = listOf(
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("1050"),
                age = 35
            )
        )

        val result = incomeValidatorService.validate(persons)

        assertThat(result.valid).isFalse
        assertThat(result.totalSum).isEqualTo(BigDecimal("1050"))
        assertThat(result.amountExceededLimit).isEqualTo(BigDecimal("-50"))
    }

    @Test
    fun `two persons below limit`() {
        val persons = listOf(
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("700"),
                age = 35
            ),
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("700"),
                age = 30
            )
        )

        val result = incomeValidatorService.validate(persons)

        assertThat(result.valid).isTrue
        assertThat(result.totalSum).isEqualTo(BigDecimal("1400"))
        assertThat(result.amountExceededLimit).isEqualTo(BigDecimal.ZERO)
    }

    @Test
    fun `two persons above limit`() {
        val persons = listOf(
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("1000"),
                age = 35
            ),
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("1000"),
                age = 30
            )
        )

        val result = incomeValidatorService.validate(persons)

        assertThat(result.valid).isFalse
        assertThat(result.totalSum).isEqualTo(BigDecimal("2000"))
        assertThat(result.amountExceededLimit).isEqualTo(BigDecimal("-500"))
    }

    @Test
    fun `three persons below limit`() {
        val persons = listOf(
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("250"),
                age = 35
            ),
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("250"),
                age = 30
            ),
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("250"),
                age = 30
            )
        )

        val result = incomeValidatorService.validate(persons)

        assertThat(result.valid).isTrue
        assertThat(result.totalSum).isEqualTo(BigDecimal("750"))
        assertThat(result.amountExceededLimit).isEqualTo(BigDecimal.ZERO)
    }

    @Test
    fun `three persons above limit`() {
        val persons = listOf(
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("600"),
                age = 35
            ),
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("600"),
                age = 30
            ),
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("650"),
                age = 30
            )
        )

        val result = incomeValidatorService.validate(persons)

        assertThat(result.valid).isFalse
        assertThat(result.totalSum).isEqualTo(BigDecimal("1850"))
        assertThat(result.amountExceededLimit).isEqualTo(BigDecimal("-150"))
    }

    @Test
    fun `three persons matching limit`() {
        val persons = listOf(
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("750"),
                age = 35
            ),
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("750"),
                age = 30
            ),
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("200"),
                age = 30
            )
        )

        val result = incomeValidatorService.validate(persons)

        assertThat(result.valid).isTrue
        assertThat(result.totalSum).isEqualTo(BigDecimal("1700"))
        assertThat(result.amountExceededLimit).isEqualTo(BigDecimal.ZERO)
    }

    @Test
    fun `family below limit`() {
        val persons = listOf(
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("500"),
                age = 35
            ),
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("500"),
                age = 30
            ),
            IncomeValidatorPerson(age = 10)
        )

        val result = incomeValidatorService.validate(persons)

        assertThat(result.valid).isTrue
        assertThat(result.totalSum).isEqualTo(BigDecimal("1015"))
        assertThat(result.limit).isEqualTo(BigDecimal("1600"))
        assertThat(result.amountExceededLimit).isEqualTo(BigDecimal.ZERO)
    }

    @Test
    fun `family matching limit`() {
        val persons = listOf(
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("1000"),
                age = 35
            ),
            IncomeValidatorPerson(
                monthlyIncome = BigDecimal("495"),
                age = 30
            ),
            IncomeValidatorPerson(age = 10)
        )

        val result = incomeValidatorService.validate(persons)

        assertThat(result.valid).isTrue
        assertThat(result.totalSum).isEqualTo(BigDecimal("1510"))
        assertThat(result.amountExceededLimit).isEqualTo(BigDecimal.ZERO)
    }

    private fun createIncomeLimitEntity(value: BigDecimal): IncomeLimitEntity {
        val entity = IncomeLimitEntity()
        entity.value = value
        return entity
    }

    private fun createAdditionalAdultLimitEntity(): IncomeLimitEntity {
        val entity = IncomeLimitEntity()
        entity.value = BigDecimal("200")
        return entity
    }

    private fun createAdditionalChildLimitEntity(): IncomeLimitEntity {
        val entity = IncomeLimitEntity()
        entity.value = BigDecimal("100")
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
