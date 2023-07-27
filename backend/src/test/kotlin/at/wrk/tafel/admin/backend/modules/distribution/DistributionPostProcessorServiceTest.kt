package at.wrk.tafel.admin.backend.modules.distribution

import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.modules.distribution.statistic.DistributionStatisticService
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import io.mockk.verify
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith

@ExtendWith(MockKExtension::class)
internal class DistributionPostProcessorServiceTest {

    @RelaxedMockK
    private lateinit var distributionStatisticService: DistributionStatisticService

    @InjectMockKs
    private lateinit var service: DistributionPostProcessorService

    @Test
    fun `process calls proper services`() {
        val distribution = mockk<DistributionEntity>()

        service.process(distribution)

        verify { distributionStatisticService.createAndSaveStatistic(distribution) }
    }

}
