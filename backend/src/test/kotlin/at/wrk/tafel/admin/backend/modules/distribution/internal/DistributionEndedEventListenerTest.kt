package at.wrk.tafel.admin.backend.modules.distribution.internal

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
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
import org.springframework.transaction.support.TransactionTemplate
import java.time.Duration
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

    // The listener builds a real RetryTemplate from these, so the retry behavior is genuinely
    // exercised - the backoff is cut to a millisecond so it isn't exercised in real time.
    private val tafelAdminProperties = TafelAdminProperties().apply {
        distribution.closeRetry.backoff = Duration.ofMillis(1)
    }

    @BeforeEach
    fun beforeEach() {
        listener = DistributionEndedEventListener(
            distributionStatisticService,
            missingCostContributionService,
            transactionTemplate,
            distributionRepository,
            eventPublisher,
            tafelAdminProperties,
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

    /**
     * The attempt count is configuration, not a constant - a close that keeps failing against a
     * database under load is exactly when somebody wants to give it more attempts, and a
     * distribution day cannot take the restart that would otherwise cost.
     */
    @Test
    fun `retries as often as configured`() {
        tafelAdminProperties.distribution.closeRetry.maxAttempts = 5
        every { missingCostContributionService.addMissingCostContributions(any()) } throws
            IllegalStateException("Test exception")

        val distributionId = 123L
        val distribution = mockk<DistributionEntity>()
        every { distribution.id } returns distributionId
        every { distributionStatisticService.saveStatistic(distribution) } returns mockk<DistributionStatisticEntity>()
        every { distributionRepository.findById(distributionId) } returns Optional.of(distribution)

        assertThrows<IllegalStateException> {
            listener.onDistributionEnded(DistributionEndedEvent(distributionId))
        }

        verify(exactly = 5) { missingCostContributionService.addMissingCostContributions(distribution) }
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
