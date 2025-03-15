package at.wrk.tafel.admin.backend.modules.distribution.internal

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.modules.distribution.internal.postprocessors.DailyReportPostProcessor
import at.wrk.tafel.admin.backend.modules.distribution.internal.postprocessors.DistributionPostProcessor
import at.wrk.tafel.admin.backend.modules.distribution.internal.postprocessors.StatisticMailPostProcessor
import at.wrk.tafel.admin.backend.modules.distribution.internal.statistic.DistributionStatisticService
import io.mockk.every
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.impl.annotations.SpyK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import io.mockk.verify
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.transaction.support.TransactionTemplate
import java.util.*

@ExtendWith(MockKExtension::class)
internal class DistributionPostProcessorServiceTest {

    @RelaxedMockK
    private lateinit var distributionStatisticService: DistributionStatisticService

    @SpyK
    private var transactionTemplate: TransactionTemplate = TransactionTemplate(mockk(relaxed = true))

    @RelaxedMockK
    private lateinit var distributionRepository: DistributionRepository

    @RelaxedMockK
    private lateinit var postProcessor1: DailyReportPostProcessor

    @RelaxedMockK
    private lateinit var postProcessor2: StatisticMailPostProcessor

    private lateinit var postProcessors: List<DistributionPostProcessor>
    private lateinit var service: DistributionPostProcessorService

    @BeforeEach
    fun beforeEach() {
        postProcessors = listOf(postProcessor1, postProcessor2)

        service = DistributionPostProcessorService(
            distributionStatisticService,
            transactionTemplate,
            distributionRepository,
            postProcessors
        )
    }

    @Test
    fun `creates statistic and calls proper postprocessors`() {
        val distributionId = 123L
        val distribution = mockk<DistributionEntity>()
        every { distribution.id } returns distributionId
        every { distribution.customers } returns listOf(
            testDistributionCustomerEntity1,
            testDistributionCustomerEntity2
        )

        val distributionStatistic = mockk<DistributionStatisticEntity>()
        every { distributionStatisticService.createAndSaveStatistic(distribution) } returns distributionStatistic
        every { distributionRepository.findById(distributionId) } returns Optional.of(distribution)

        service.process(distributionId)

        verify(exactly = 1) { transactionTemplate.executeWithoutResult(any()) }
        verify(exactly = 1) { distributionStatisticService.createAndSaveStatistic(distribution) }
        verify(exactly = 1) { postProcessors[0].process(distribution, distributionStatistic) }
        verify(exactly = 1) { postProcessors[1].process(distribution, distributionStatistic) }
    }

}
