package at.wrk.tafel.admin.backend.modules.distribution.internal

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.modules.distribution.events.DistributionClosedEvent
import at.wrk.tafel.admin.backend.modules.distribution.internal.statistic.DistributionStatisticService
import at.wrk.tafel.admin.backend.modules.distribution.internal.statistic.MissingCostContributionService
import io.mockk.every
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.impl.annotations.SpyK
import io.mockk.junit5.MockKExtension
import io.mockk.mockk
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.context.ApplicationEventPublisher
import org.springframework.retry.support.RetryTemplate
import org.springframework.transaction.support.TransactionTemplate
import java.util.*

@ExtendWith(MockKExtension::class)
internal class DistributionEndedEventListenerTest {

    @RelaxedMockK
    private lateinit var distributionStatisticService: DistributionStatisticService

    @RelaxedMockK
    private lateinit var missingCostContributionService: MissingCostContributionService

    @SpyK
    private var transactionTemplate: TransactionTemplate = TransactionTemplate(mockk(relaxed = true))

    @RelaxedMockK
    private lateinit var distributionRepository: DistributionRepository

    @RelaxedMockK
    private lateinit var eventPublisher: ApplicationEventPublisher

    private lateinit var listener: DistributionEndedEventListener

    @BeforeEach
    fun beforeEach() {
        // Real RetryTemplate (not mocked) with no backoff, so retry behavior is genuinely exercised
        // without slowing the test down with real waits between attempts.
        val retryTemplate = RetryTemplate.builder()
            .maxAttempts(3)
            .noBackoff()
            .retryOn(Exception::class.java)
            .build()

        listener = DistributionEndedEventListener(
            distributionStatisticService,
            missingCostContributionService,
            transactionTemplate,
            distributionRepository,
            eventPublisher,
            retryTemplate,
        )
    }

    @Test
    fun `creates statistic, adds missing cost contributions, and publishes event`() {
        val distributionId = 123L
        val distribution = mockk<DistributionEntity>()
        every { distribution.id } returns distributionId

        val distributionStatistic = mockk<DistributionStatisticEntity>()
        every { distributionStatisticService.saveStatistic(distribution) } returns distributionStatistic
        every { distributionRepository.findById(distributionId) } returns Optional.of(distribution)

        listener.onDistributionEnded(DistributionEndedEvent(distributionId))

        verify(exactly = 1) { transactionTemplate.executeWithoutResult(any()) }
        verify(exactly = 1) { distributionStatisticService.saveStatistic(distribution) }
        verify(exactly = 1) { missingCostContributionService.addMissingCostContributions(distribution) }
        verify(exactly = 1) { eventPublisher.publishEvent(DistributionClosedEvent(distributionId)) }
    }

    @Test
    fun `retries the whole transaction on transient failure and succeeds`() {
        val distributionId = 123L
        val distribution = mockk<DistributionEntity>()
        every { distribution.id } returns distributionId

        val distributionStatistic = mockk<DistributionStatisticEntity>()
        every { distributionStatisticService.saveStatistic(distribution) } returns distributionStatistic
        every { distributionRepository.findById(distributionId) } returns Optional.of(distribution)
        every { missingCostContributionService.addMissingCostContributions(distribution) } throws
            IllegalStateException("transient failure") andThenThrows
            IllegalStateException("transient failure") andThen Unit

        listener.onDistributionEnded(DistributionEndedEvent(distributionId))

        verify(exactly = 3) { distributionStatisticService.saveStatistic(distribution) }
        verify(exactly = 3) { missingCostContributionService.addMissingCostContributions(distribution) }
        verify(exactly = 1) { eventPublisher.publishEvent(DistributionClosedEvent(distributionId)) }
    }

    @Test
    fun `rolls back, retries, and never publishes event when adding missing cost contributions keeps failing`() {
        every { missingCostContributionService.addMissingCostContributions(any()) } throws
            IllegalStateException("Test exception")

        val distributionId = 123L
        val distribution = mockk<DistributionEntity>()
        every { distribution.id } returns distributionId

        val distributionStatistic = mockk<DistributionStatisticEntity>()
        every { distributionStatisticService.saveStatistic(distribution) } returns distributionStatistic
        every { distributionRepository.findById(distributionId) } returns Optional.of(distribution)

        assertThrows<IllegalStateException> {
            listener.onDistributionEnded(DistributionEndedEvent(distributionId))
        }

        verify(exactly = 3) { missingCostContributionService.addMissingCostContributions(distribution) }
        verify(exactly = 0) { eventPublisher.publishEvent(any<DistributionClosedEvent>()) }
    }

    @Test
    fun `forwards the error when event publishing fails, without retrying it`() {
        every { eventPublisher.publishEvent(any<DistributionClosedEvent>()) } throws IllegalStateException("Test exception")

        val distributionId = 123L
        val distribution = mockk<DistributionEntity>()
        every { distribution.id } returns distributionId

        val distributionStatistic = mockk<DistributionStatisticEntity>()
        every { distributionStatisticService.saveStatistic(distribution) } returns distributionStatistic
        every { distributionRepository.findById(distributionId) } returns Optional.of(distribution)

        val exception = assertThrows<IllegalStateException> {
            listener.onDistributionEnded(DistributionEndedEvent(distributionId))
        }

        assertThat(exception.message).isEqualTo("Test exception")
        verify(exactly = 1) { missingCostContributionService.addMissingCostContributions(distribution) }
        verify(exactly = 1) { eventPublisher.publishEvent(DistributionClosedEvent(distributionId)) }
    }
}
