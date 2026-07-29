package at.wrk.tafel.admin.backend.modules.distribution.internal

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.modules.distribution.DistributionClosedEvent
import at.wrk.tafel.admin.backend.modules.distribution.internal.postprocessors.DistributionPostProcessor
import at.wrk.tafel.admin.backend.modules.distribution.internal.statistic.DistributionStatisticService
import org.slf4j.LoggerFactory
import org.springframework.context.ApplicationEventPublisher
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Service
import org.springframework.transaction.support.TransactionTemplate

/**
 * Runs the [DistributionPostProcessor] chain after a distribution closes.
 *
 * `process` is `@Async`, so it runs off the request thread in its own transaction, decoupled
 * from whatever committed the distribution's closed state - the [DistributionEntity] is
 * therefore re-fetched by id here rather than passed in directly, so its lazy associations are
 * bound to this method's own persistence context instead of a stale/detached one. All registered
 * [DistributionPostProcessor] beans then run in sequence, each wrapped in its own try/catch so
 * one processor failing (e.g. a mail post-processor) does not stop the others from running.
 * Finally, a [DistributionClosedEvent] is published (same try/catch isolation) for other modules -
 * e.g. `reporting`, which emails the daily report/statistic exports - to react to without this
 * module depending on them directly.
 */
@Service
class DistributionPostProcessorService(
    private val distributionStatisticService: DistributionStatisticService,
    private val transactionTemplate: TransactionTemplate,
    private val distributionRepository: DistributionRepository,
    private val postProcessors: List<DistributionPostProcessor>,
    private val eventPublisher: ApplicationEventPublisher,
) {
    companion object {
        private val logger = LoggerFactory.getLogger(DistributionPostProcessorService::class.java)
    }

    @Async
    fun process(distributionId: Long) {
        transactionTemplate.executeWithoutResult {
            // Re-fetch in this transaction's persistence context to ensure lazy associations work properly
            // The distribution passed here is from a committed REQUIRES_NEW transaction, so the fetch is safe
            val distribution = distributionRepository.findById(distributionId).get()
            val statistic = distributionStatisticService.saveStatistic(distribution)

            postProcessors.forEach {
                val postProcessorName = it.javaClass.simpleName
                try {
                    logger.info("Postprocessing - $postProcessorName ... started")
                    it.process(distribution, statistic)
                    logger.info("Postprocessing - $postProcessorName ... done")
                } catch (e: Exception) {
                    logger.error("Postprocessing - $postProcessorName ... failed", e)
                }
            }

            try {
                logger.info("Postprocessing - DistributionClosedEvent ... started")
                eventPublisher.publishEvent(DistributionClosedEvent(distributionId))
                logger.info("Postprocessing - DistributionClosedEvent ... done")
            } catch (e: Exception) {
                logger.error("Postprocessing - DistributionClosedEvent ... failed", e)
            }
        }
    }
}
