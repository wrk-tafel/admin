package at.wrk.tafel.admin.backend.modules.distribution.internal.statistic

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionHouseholdEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticRepository
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.database.model.person.PersonEntity
import at.wrk.tafel.admin.backend.modules.base.country.testCountry1
import at.wrk.tafel.admin.backend.modules.base.exception.BusinessRuleException
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionHouseholdEntity1
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionHouseholdEntity2
import at.wrk.tafel.admin.backend.modules.distribution.internal.testDistributionHouseholdEntity3
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCollectionRoute1Entity
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCollectionRoute2Entity
import at.wrk.tafel.admin.backend.modules.logistics.testFoodCollectionRoute3Entity
import at.wrk.tafel.admin.backend.security.testUserEntity
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDate
import java.time.LocalDateTime

@ExtendWith(MockKExtension::class)
internal class DistributionStatisticServiceTest {

    @RelaxedMockK
    private lateinit var distributionStatisticRepository: DistributionStatisticRepository

    @RelaxedMockK
    private lateinit var householdRepository: HouseholdRepository

    @InjectMockKs
    private lateinit var service: DistributionStatisticService

    private var nextHouseholdIdCounter = 1000L
    private fun nextHouseholdId() = nextHouseholdIdCounter++

    @Test
    fun `create and save statistic`() {
        val testDistributionEntity = DistributionEntity(startedAt = LocalDateTime.now().minusHours(2), startedByUser = testUserEntity).apply {
            id = 123
            endedAt = LocalDateTime.now()
            households = listOf(
                testDistributionHouseholdEntity1,
                testDistributionHouseholdEntity2,
                testDistributionHouseholdEntity3,
            )
            foodCollections = listOf(
                testFoodCollectionRoute1Entity,
                testFoodCollectionRoute2Entity,
                testFoodCollectionRoute3Entity,
            )
        }
        testDistributionEntity.statistic = DistributionStatisticEntity(distribution = testDistributionEntity).apply {
            employeeCount = 100
        }
        val statisticStartTime = testDistributionEntity.startedAt.toLocalDate().atStartOfDay()
        val statisticEndTime = testDistributionEntity.endedAt!!

        val testCustomersNew =
            listOfNotNull(testDistributionHouseholdEntity1.household, testDistributionHouseholdEntity2.household)
        every {
            householdRepository.findAllByCreatedAtBetween(
                statisticStartTime,
                statisticEndTime,
            )
        } returns testCustomersNew

        val testCountCustomersUpdated = 456
        every {
            householdRepository.countByUpdatedAtBetween(
                statisticStartTime,
                statisticEndTime,
            )
        } returns testCountCustomersUpdated

        val testCustomersProlonged =
            listOfNotNull(testDistributionHouseholdEntity1.household, testDistributionHouseholdEntity2.household)
        every {
            householdRepository.findAllByProlongedAtBetween(
                statisticStartTime,
                statisticEndTime,
            )
        } returns testCustomersProlonged

        every { distributionStatisticRepository.save(any()) } returns mockk()

        val createdStatistic = service.saveStatistic(testDistributionEntity)
        assertThat(createdStatistic).isNotNull

        val savedStatisticSlot = slot<DistributionStatisticEntity>()
        verify { distributionStatisticRepository.save(capture(savedStatisticSlot)) }

        val savedStatistic = savedStatisticSlot.captured
        assertThat(savedStatistic.distribution).isEqualTo(testDistributionEntity)
        assertThat(savedStatistic.employeeCount).isEqualTo(100)

        assertThat(savedStatistic.countCustomers).isEqualTo(3)
        assertThat(savedStatistic.countPersons).isEqualTo(4)
        assertThat(savedStatistic.countInfants).isEqualTo(1)
        assertThat(savedStatistic.averagePersonsPerCustomer).isEqualTo(
            BigDecimal(1.33).setScale(2, RoundingMode.HALF_EVEN),
        )
        assertThat(savedStatistic.countCustomersNew).isEqualTo(testCustomersNew.size)
        assertThat(savedStatistic.countPersonsNew).isEqualTo(3)
        assertThat(savedStatistic.countCustomersProlonged).isEqualTo(testCustomersProlonged.size)
        assertThat(savedStatistic.countPersonsProlonged).isEqualTo(3)
        assertThat(savedStatistic.countCustomersUpdated).isEqualTo(testCountCustomersUpdated - testCustomersNew.size - testCustomersProlonged.size)
        assertThat(savedStatistic.countSingleParentHouseholds).isEqualTo(0)

        assertThat(savedStatistic.shopsTotalCount).isEqualTo(3)
        assertThat(savedStatistic.shopsWithFoodCount).isEqualTo(2)
        assertThat(savedStatistic.foodTotalAmount).isEqualTo(BigDecimal(145))
        assertThat(savedStatistic.foodPerShopAverage).isEqualTo(BigDecimal("72.50"))
        assertThat(savedStatistic.routesLengthKm).isEqualTo(11211)
    }

    @Test
    fun `create and save empty statistic with empty distribution including empty statistic`() {
        val testDistributionEntity = DistributionEntity(startedAt = LocalDateTime.now().minusHours(2), startedByUser = testUserEntity).apply {
            id = 123
            endedAt = LocalDateTime.now()
        }
        testDistributionEntity.statistic = DistributionStatisticEntity(distribution = testDistributionEntity)

        every { householdRepository.findAllByCreatedAtBetween(any(), any()) } returns emptyList()
        every { householdRepository.countByUpdatedAtBetween(any(), any()) } returns 0
        every { householdRepository.findAllByProlongedAtBetween(any(), any()) } returns emptyList()
        every { distributionStatisticRepository.save(any()) } returns mockk()

        service.saveStatistic(testDistributionEntity)

        val savedStatisticSlot = slot<DistributionStatisticEntity>()
        verify { distributionStatisticRepository.save(capture(savedStatisticSlot)) }

        val savedStatistic = savedStatisticSlot.captured
        assertThat(savedStatistic.distribution).isEqualTo(testDistributionEntity)
        assertThat(savedStatistic.countCustomers).isEqualTo(0)
        assertThat(savedStatistic.countPersons).isEqualTo(0)
        assertThat(savedStatistic.countInfants).isEqualTo(0)
        assertThat(savedStatistic.averagePersonsPerCustomer).isEqualTo(BigDecimal.ZERO)
        assertThat(savedStatistic.countCustomersNew).isEqualTo(0)
        assertThat(savedStatistic.countPersonsNew).isEqualTo(0)
        assertThat(savedStatistic.countCustomersProlonged).isEqualTo(0)
        assertThat(savedStatistic.countPersonsProlonged).isEqualTo(0)
        assertThat(savedStatistic.countCustomersUpdated).isEqualTo(0)
        assertThat(savedStatistic.countSingleParentHouseholds).isEqualTo(0)

        assertThat(savedStatistic.shopsTotalCount).isEqualTo(0)
        assertThat(savedStatistic.shopsWithFoodCount).isEqualTo(0)
        assertThat(savedStatistic.foodTotalAmount).isEqualTo(BigDecimal.ZERO)
        assertThat(savedStatistic.foodPerShopAverage).isEqualTo(BigDecimal.ZERO)
        assertThat(savedStatistic.routesLengthKm).isEqualTo(0)
    }

    @Test
    fun `count single parent households only counts registered households flagged as such`() {
        val testDistributionEntity = DistributionEntity(startedAt = LocalDateTime.now().minusHours(2), startedByUser = testUserEntity).apply {
            id = 123
            endedAt = LocalDateTime.now()
        }
        testDistributionEntity.statistic = DistributionStatisticEntity(distribution = testDistributionEntity)

        fun household(singleParent: Boolean) = HouseholdEntity(householdId = nextHouseholdId(), validUntil = LocalDate.now()).apply {
            this.singleParent = singleParent
        }

        val singleParentHousehold1 = DistributionHouseholdEntity(distribution = testDistributionEntity, household = household(true), ticketNumber = 1)
        val singleParentHousehold2 = DistributionHouseholdEntity(distribution = testDistributionEntity, household = household(true), ticketNumber = 2)
        val nonSingleParentHousehold = DistributionHouseholdEntity(distribution = testDistributionEntity, household = household(false), ticketNumber = 3)

        // a household that never had the flag set explicitly - it defaults to false
        val defaultedHousehold = DistributionHouseholdEntity(
            distribution = testDistributionEntity,
            household = HouseholdEntity(householdId = nextHouseholdId(), validUntil = LocalDate.now()),
            ticketNumber = 4,
        )

        testDistributionEntity.households = listOf(
            singleParentHousehold1,
            singleParentHousehold2,
            nonSingleParentHousehold,
            defaultedHousehold,
        )

        every { householdRepository.findAllByCreatedAtBetween(any(), any()) } returns emptyList()
        every { householdRepository.countByUpdatedAtBetween(any(), any()) } returns 0
        every { householdRepository.findAllByProlongedAtBetween(any(), any()) } returns emptyList()
        every { distributionStatisticRepository.save(any()) } returns mockk()

        service.saveStatistic(testDistributionEntity)

        val savedStatisticSlot = slot<DistributionStatisticEntity>()
        verify { distributionStatisticRepository.save(capture(savedStatisticSlot)) }

        assertThat(savedStatisticSlot.captured.countSingleParentHouseholds).isEqualTo(2)
    }

    @Test
    fun `count infants uses the age on the distribution day, not the age today`() {
        val startedAt = LocalDateTime.now().minusYears(3)
        val testDistributionEntity = DistributionEntity(startedAt = startedAt, startedByUser = testUserEntity).apply {
            id = 123
            endedAt = startedAt.plusHours(2)
        }
        testDistributionEntity.statistic = DistributionStatisticEntity(distribution = testDistributionEntity)

        val household = HouseholdEntity(householdId = nextHouseholdId(), validUntil = LocalDate.now())
        val mainPerson = PersonEntity(household = household, country = testCountry1, isMainPerson = true).apply {
            birthDate = LocalDate.now().minusYears(40)
        }
        household.persons.add(mainPerson)
        household.mainPerson = mainPerson
        // 2 years old when the distribution ran, 5 years old today
        household.persons.add(
            PersonEntity(household = household, country = testCountry1).apply {
                birthDate = startedAt.toLocalDate().minusYears(2)
                excludeFromHousehold = false
            },
        )

        testDistributionEntity.households = listOf(
            DistributionHouseholdEntity(
                distribution = testDistributionEntity,
                household = household,
                ticketNumber = 1,
            ),
        )

        every { householdRepository.findAllByCreatedAtBetween(any(), any()) } returns emptyList()
        every { householdRepository.countByUpdatedAtBetween(any(), any()) } returns 0
        every { householdRepository.findAllByProlongedAtBetween(any(), any()) } returns emptyList()
        every { distributionStatisticRepository.save(any()) } returns mockk()

        service.saveStatistic(testDistributionEntity)

        val savedStatisticSlot = slot<DistributionStatisticEntity>()
        verify { distributionStatisticRepository.save(capture(savedStatisticSlot)) }

        assertThat(savedStatisticSlot.captured.countInfants).isEqualTo(1)
    }

    @Test
    fun `create and save empty statistic with empty distribution missing statistic`() {
        val testDistributionEntity = DistributionEntity(startedAt = LocalDateTime.now().minusHours(2), startedByUser = testUserEntity).apply {
            id = 123
            endedAt = LocalDateTime.now()
        }

        val message = assertThrows<BusinessRuleException> { service.saveStatistic(testDistributionEntity) }
        assertThat(message.body.detail).isEqualTo("Statistik-Daten nicht vorhanden!")
    }
}
