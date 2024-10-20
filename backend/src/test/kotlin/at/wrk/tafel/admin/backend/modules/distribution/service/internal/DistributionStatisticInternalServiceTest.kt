package at.wrk.tafel.admin.backend.modules.distribution.service.internal

import at.wrk.tafel.admin.backend.common.testdata.testDistributionCustomerEntity1
import at.wrk.tafel.admin.backend.common.testdata.testDistributionCustomerEntity2
import at.wrk.tafel.admin.backend.common.testdata.testDistributionCustomerEntity3
import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.database.repositories.customer.CustomerRepository
import at.wrk.tafel.admin.backend.database.repositories.distribution.DistributionStatisticRepository
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDateTime

@ExtendWith(MockKExtension::class)
internal class DistributionStatisticInternalServiceTest {

    @RelaxedMockK
    private lateinit var distributionStatisticRepository: DistributionStatisticRepository

    @RelaxedMockK
    private lateinit var customerRepository: CustomerRepository

    @InjectMockKs
    private lateinit var service: DistributionStatisticInternalService

    @Test
    fun `create and save statistic`() {
        val testDistributionEntity = DistributionEntity().apply {
            id = 123
            startedAt = LocalDateTime.now().minusHours(2)
            endedAt = LocalDateTime.now()
            customers = listOf(
                testDistributionCustomerEntity1,
                testDistributionCustomerEntity2,
                testDistributionCustomerEntity3
            )
        }
        val statisticStartTime = testDistributionEntity.startedAt!!.toLocalDate().atStartOfDay()
        val statisticEndTime = testDistributionEntity.endedAt!!

        val testCustomersNew =
            listOfNotNull(testDistributionCustomerEntity1.customer, testDistributionCustomerEntity2.customer)
        every {
            customerRepository.findAllByCreatedAtBetween(
                statisticStartTime,
                statisticEndTime
            )
        } returns testCustomersNew

        val testCountCustomersUpdated = 456
        every {
            customerRepository.countByUpdatedAtBetween(
                statisticStartTime,
                statisticEndTime
            )
        } returns testCountCustomersUpdated

        val testCustomersProlonged =
            listOfNotNull(testDistributionCustomerEntity1.customer, testDistributionCustomerEntity2.customer)
        every {
            customerRepository.findAllByProlongedAtBetween(
                statisticStartTime,
                statisticEndTime
            )
        } returns testCustomersProlonged

        every { distributionStatisticRepository.save(any()) } returns mockk()

        val createdStatistic = service.createAndSaveStatistic(testDistributionEntity)
        assertThat(createdStatistic).isNotNull

        val savedStatisticSlot = slot<DistributionStatisticEntity>()
        verify { distributionStatisticRepository.save(capture(savedStatisticSlot)) }

        val savedStatistic = savedStatisticSlot.captured
        assertThat(savedStatistic.distribution).isEqualTo(testDistributionEntity)
        assertThat(savedStatistic.countCustomers).isEqualTo(3)
        assertThat(savedStatistic.countPersons).isEqualTo(4)
        assertThat(savedStatistic.countInfants).isEqualTo(1)
        assertThat(savedStatistic.averagePersonsPerCustomer).isEqualTo(
            BigDecimal(1.33).setScale(2, RoundingMode.HALF_EVEN)
        )
        assertThat(savedStatistic.countCustomersNew).isEqualTo(testCustomersNew.size)
        assertThat(savedStatistic.countPersonsNew).isEqualTo(3)
        assertThat(savedStatistic.countCustomersProlonged).isEqualTo(testCustomersProlonged.size)
        assertThat(savedStatistic.countPersonsProlonged).isEqualTo(3)
        assertThat(savedStatistic.countCustomersUpdated).isEqualTo(testCountCustomersUpdated - testCustomersNew.size - testCustomersProlonged.size)
    }

    @Test
    fun `create and save empty statistic without customers`() {
        val testDistributionEntity = DistributionEntity().apply {
            id = 123
            startedAt = LocalDateTime.now().minusHours(2)
            endedAt = LocalDateTime.now()
            customers = emptyList()
        }

        every { customerRepository.findAllByCreatedAtBetween(any(), any()) } returns emptyList()
        every { customerRepository.countByUpdatedAtBetween(any(), any()) } returns 0
        every { customerRepository.findAllByProlongedAtBetween(any(), any()) } returns emptyList()
        every { distributionStatisticRepository.save(any()) } returns mockk()

        service.createAndSaveStatistic(testDistributionEntity)

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
    }

}
