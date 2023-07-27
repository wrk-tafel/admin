package at.wrk.tafel.admin.backend.modules.distribution.statistic

import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.database.repositories.customer.CustomerRepository
import at.wrk.tafel.admin.backend.database.repositories.distribution.DistributionStatisticRepository
import at.wrk.tafel.admin.backend.modules.distribution.testDistributionCustomerEntity1
import at.wrk.tafel.admin.backend.modules.distribution.testDistributionCustomerEntity2
import at.wrk.tafel.admin.backend.modules.distribution.testDistributionCustomerEntity3
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.ZonedDateTime

@ExtendWith(MockKExtension::class)
internal class DistributionStatisticServiceTest {

    @RelaxedMockK
    private lateinit var distributionStatisticRepository: DistributionStatisticRepository

    @RelaxedMockK
    private lateinit var customerRepository: CustomerRepository

    @InjectMockKs
    private lateinit var service: DistributionStatisticService

    @Test
    fun `create and save statistic`() {
        val testDistributionEntity = DistributionEntity().apply {
            id = 123
            startedAt = ZonedDateTime.now().minusHours(2)
            endedAt = ZonedDateTime.now()
            customers = listOf(
                testDistributionCustomerEntity1,
                testDistributionCustomerEntity2,
                testDistributionCustomerEntity3
            )
        }

        val testCountCustomersNew = 123
        every {
            customerRepository.countByCreatedAtBetween(
                testDistributionEntity.startedAt!!,
                testDistributionEntity.endedAt!!
            )
        } returns testCountCustomersNew

        val testCountCustomersUpdated = 456
        every {
            customerRepository.countByUpdatedAtBetween(
                testDistributionEntity.startedAt!!,
                testDistributionEntity.endedAt!!
            )
        } returns testCountCustomersUpdated

        val testCountCustomersProlonged = 456
        every {
            customerRepository.countByProlongedAtBetween(
                testDistributionEntity.startedAt!!,
                testDistributionEntity.endedAt!!
            )
        } returns testCountCustomersProlonged

        every { distributionStatisticRepository.save(any()) } returns mockk()

        service.createAndSaveStatistic(testDistributionEntity)

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
        assertThat(savedStatistic.countCustomersNew).isEqualTo(testCountCustomersNew)
        assertThat(savedStatistic.countCustomersProlonged).isEqualTo(testCountCustomersProlonged)
        assertThat(savedStatistic.countCustomersUpdated).isEqualTo(testCountCustomersUpdated)
    }

    @Test
    fun `create and save empty statistic without customers`() {
        val testDistributionEntity = DistributionEntity().apply {
            id = 123
            startedAt = ZonedDateTime.now().minusHours(2)
            endedAt = ZonedDateTime.now()
            customers = emptyList()
        }

        every {
            customerRepository.countByCreatedAtBetween(
                testDistributionEntity.startedAt!!,
                testDistributionEntity.endedAt!!
            )
        } returns 0

        every {
            customerRepository.countByUpdatedAtBetween(
                testDistributionEntity.startedAt!!,
                testDistributionEntity.endedAt!!
            )
        } returns 0

        every {
            customerRepository.countByProlongedAtBetween(
                testDistributionEntity.startedAt!!,
                testDistributionEntity.endedAt!!
            )
        } returns 0

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
        assertThat(savedStatistic.countCustomersProlonged).isEqualTo(0)
        assertThat(savedStatistic.countCustomersUpdated).isEqualTo(0)
    }

}
