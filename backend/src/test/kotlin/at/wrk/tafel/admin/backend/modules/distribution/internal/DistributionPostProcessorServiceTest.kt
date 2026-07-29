package at.wrk.tafel.admin.backend.modules.distribution.internal

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import at.wrk.tafel.admin.backend.modules.distribution.DistributionClosedEvent
import at.wrk.tafel.admin.backend.modules.distribution.internal.postprocessors.DistributionPostProcessor
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
import org.springframework.context.ApplicationEventPublisher
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
    private lateinit var eventPublisher: ApplicationEventPublisher

    private val failingPostProcessor = mockk<DistributionPostProcessor>()
    private val successfulPostProcessor = mockk<DistributionPostProcessor>()

    @BeforeEach
    fun beforeEach() {
        every { failingPostProcessor.process(any(), any()) } throws TafelValidationException("Test exception")
    }

    @Test
    fun `creates statistic and calls proper postprocessors`() {
        val service = DistributionPostProcessorService(
            distributionStatisticService,
            transactionTemplate,
            distributionRepository,
            listOf(
                successfulPostProcessor,
                successfulPostProcessor,
            ),
            eventPublisher,
        )

        val distributionId = 123L
        val distribution = mockk<DistributionEntity>()
        every { distribution.id } returns distributionId
        every { distribution.households } returns listOf(
            testDistributionHouseholdEntity1,
            testDistributionHouseholdEntity2,
        )

        val distributionStatistic = mockk<DistributionStatisticEntity>()
        every { distributionStatisticService.saveStatistic(distribution) } returns distributionStatistic
        every { distributionRepository.findById(distributionId) } returns Optional.of(distribution)

        service.process(distributionId)

        verify(exactly = 1) { transactionTemplate.executeWithoutResult(any()) }
        verify(exactly = 1) { distributionStatisticService.saveStatistic(distribution) }
        verify(exactly = 2) { successfulPostProcessor.process(distribution, distributionStatistic) }
        verify(exactly = 1) { eventPublisher.publishEvent(DistributionClosedEvent(distributionId)) }
    }

    @Test
    fun `still proceeds when one process fails`() {
        val service = DistributionPostProcessorService(
            distributionStatisticService,
            transactionTemplate,
            distributionRepository,
            listOf(
                failingPostProcessor,
                successfulPostProcessor,
            ),
            eventPublisher,
        )

        val distributionId = 123L
        val distribution = mockk<DistributionEntity>()
        every { distribution.id } returns distributionId
        every { distribution.households } returns listOf(
            testDistributionHouseholdEntity1,
            testDistributionHouseholdEntity2,
        )

        val distributionStatistic = mockk<DistributionStatisticEntity>()
        every { distributionStatisticService.saveStatistic(distribution) } returns distributionStatistic
        every { distributionRepository.findById(distributionId) } returns Optional.of(distribution)

        service.process(distributionId)

        verify(exactly = 1) { failingPostProcessor.process(distribution, distributionStatistic) }
        verify(exactly = 1) { successfulPostProcessor.process(distribution, distributionStatistic) }
        verify(exactly = 1) { eventPublisher.publishEvent(DistributionClosedEvent(distributionId)) }
    }

    @Test
    fun `still publishes event when a postprocessor fails`() {
        val service = DistributionPostProcessorService(
            distributionStatisticService,
            transactionTemplate,
            distributionRepository,
            listOf(failingPostProcessor),
            eventPublisher,
        )

        val distributionId = 123L
        val distribution = mockk<DistributionEntity>()
        every { distribution.id } returns distributionId
        every { distribution.households } returns listOf(
            testDistributionHouseholdEntity1,
            testDistributionHouseholdEntity2,
        )

        val distributionStatistic = mockk<DistributionStatisticEntity>()
        every { distributionStatisticService.saveStatistic(distribution) } returns distributionStatistic
        every { distributionRepository.findById(distributionId) } returns Optional.of(distribution)

        service.process(distributionId)

        verify(exactly = 1) { eventPublisher.publishEvent(DistributionClosedEvent(distributionId)) }
    }

    @Test
    fun `still finishes when event publishing fails`() {
        every { eventPublisher.publishEvent(any()) } throws TafelValidationException("Test exception")

        val service = DistributionPostProcessorService(
            distributionStatisticService,
            transactionTemplate,
            distributionRepository,
            listOf(successfulPostProcessor),
            eventPublisher,
        )

        val distributionId = 123L
        val distribution = mockk<DistributionEntity>()
        every { distribution.id } returns distributionId
        every { distribution.households } returns listOf(
            testDistributionHouseholdEntity1,
            testDistributionHouseholdEntity2,
        )

        val distributionStatistic = mockk<DistributionStatisticEntity>()
        every { distributionStatisticService.saveStatistic(distribution) } returns distributionStatistic
        every { distributionRepository.findById(distributionId) } returns Optional.of(distribution)

        service.process(distributionId)

        verify(exactly = 1) { successfulPostProcessor.process(distribution, distributionStatistic) }
        verify(exactly = 1) { eventPublisher.publishEvent(DistributionClosedEvent(distributionId)) }
    }
}
