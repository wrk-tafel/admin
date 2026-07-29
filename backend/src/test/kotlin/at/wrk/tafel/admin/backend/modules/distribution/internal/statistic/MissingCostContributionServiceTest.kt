package at.wrk.tafel.admin.backend.modules.distribution.internal.statistic

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueEntity
import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueRepository
import at.wrk.tafel.admin.backend.database.model.staticdata.StaticValueType
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionHouseholdEntity1
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionHouseholdEntity2
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionHouseholdEntity3
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionHouseholdEntity4
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.data.repository.findByIdOrNull
import java.math.BigDecimal

@ExtendWith(MockKExtension::class)
class MissingCostContributionServiceTest {

    @RelaxedMockK
    private lateinit var householdRepository: HouseholdRepository

    @RelaxedMockK
    private lateinit var staticValueRepository: StaticValueRepository

    @InjectMockKs
    private lateinit var service: MissingCostContributionService

    @Test
    fun `processed missing cost contributions`() {
        val mockStaticValue = mockk<StaticValueEntity>().apply {
            every { amount } returns BigDecimal(5)
        }
        every {
            staticValueRepository.findSingleValueOfType(StaticValueType.COST_CONTRIBUTION, any())
        } returns mockStaticValue

        val distribution = mockk<DistributionEntity>()
        val testDistributionHouseholdEntities = listOf(
            testDistributionHouseholdEntity1,
            testDistributionHouseholdEntity2,
            testDistributionHouseholdEntity3,
            testDistributionHouseholdEntity4,
        )
        every { distribution.households } returns testDistributionHouseholdEntities
        every { householdRepository.findByIdOrNull(1L) } returns testDistributionHouseholdEntity1.household
        every { householdRepository.findByIdOrNull(2L) } returns testDistributionHouseholdEntity2.household
        every { householdRepository.findByIdOrNull(3L) } returns testDistributionHouseholdEntity3.household

        every { householdRepository.save(any()) } returns mockk()

        service.addMissingCostContributions(distribution)

        val capturedHouseholds = mutableListOf<HouseholdEntity>()
        verify {
            householdRepository.save(capture(capturedHouseholds))
        }

        val customer1 = capturedHouseholds.first()
        assertThat(customer1.pendingCostContribution).isEqualTo(BigDecimal("17"))
        val customer2 = capturedHouseholds[1]
        assertThat(customer2.pendingCostContribution).isEqualTo(BigDecimal("5"))

        verify(exactly = 0) {
            householdRepository.save(testDistributionHouseholdEntity3.household!!)
            householdRepository.save(testDistributionHouseholdEntity4.household!!)
        }
    }

    @Test
    fun `cost contributions static value missing`() {
        every { staticValueRepository.findSingleValueOfType(StaticValueType.COST_CONTRIBUTION, any()) } returns null

        val distribution = mockk<DistributionEntity>()

        val exception = assertThrows<TafelValidationException> { service.addMissingCostContributions(distribution) }
        assertThat(exception.message).isEqualTo("No cost contribution value found. Skipping missing cost contribution post processing.")
    }
}
