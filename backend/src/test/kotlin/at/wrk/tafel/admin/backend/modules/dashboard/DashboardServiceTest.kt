package at.wrk.tafel.admin.backend.modules.dashboard

import at.wrk.tafel.admin.backend.database.repositories.distribution.DistributionCustomerRepository
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith

@ExtendWith(MockKExtension::class)
internal class DashboardServiceTest {

    @RelaxedMockK
    private lateinit var distributionCustomerRepository: DistributionCustomerRepository

    @InjectMockKs
    private lateinit var service: DashboardService

    @Test
    fun `get registered customers`() {
        val countRegisteredCustomers = 5
        every { distributionCustomerRepository.countAllByDistributionFirstByEndedAtIsNullOrderByStartedAtDesc() } returns countRegisteredCustomers

        val data = service.getData()

        assertThat(data.registeredCustomers).isEqualTo(countRegisteredCustomers)
    }

}
