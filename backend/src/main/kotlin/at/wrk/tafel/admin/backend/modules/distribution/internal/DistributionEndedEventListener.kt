package at.wrk.tafel.admin.backend.modules.distribution.internal

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.modules.distribution.events.DistributionClosedEvent
import at.wrk.tafel.admin.backend.modules.distribution.internal.statistic.DistributionStatisticService
import at.wrk.tafel.admin.backend.modules.distribution.internal.statistic.MissingCostContributionService
import org.slf4j.LoggerFactory
import org.springframework.context.ApplicationEventPublisher
import org.springframework.context.event.EventListener
import org.springframework.retry.support.RetryTemplate
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Service
import org.springframework.transaction.support.TransactionTemplate

/**
 * Reacts to [DistributionEndedEvent] (published by [DistributionService.closeDistribution]) with
 * everything that needs to happen right after a distribution closes: (re)computing and saving the
 * statistics snapshot via [DistributionStatisticService], adding missing cost contributions to pending
 * household balances via [MissingCostContributionService], and finally publishing
 * [DistributionClosedEvent] for other modules - e.g. `reporting`, which emails the daily
 * report/statistic/return-boxes summaries - to react to without this module depending on them directly.
 *
 * `onDistributionEnded` is `@Async`, so it runs off the request thread in its own transaction,
 * decoupled from whatever committed the distribution's closed state - the `DistributionEntity` is
 * therefore re-fetched by id here rather than passed in directly, so its lazy associations are bound to
 * this method's own persistence context instead of a stale/detached one. Statistic and missing-cost-
 * contribution are *not* individually isolated with try/catch - both run in the same transaction, so a
 * failure in either rolls the whole thing back rather than silently committing a half-done result (e.g.
 * a saved statistic with no cost contributions applied). That whole transaction is retried (via the
 * shared `RetryTemplate` bean from `config.RetryConfig`) before being given up on - safe to retry as a
 * unit precisely because a failed attempt leaves no partial state behind (the rollback already
 * guarantees that), so a retry always starts from a clean slate. If every attempt fails,
 * [DistributionClosedEvent] is never published either - Spring's default async-uncaught-exception
 * handler just logs it.
 *
 * Publishing [DistributionClosedEvent] itself is *not* retried here, deliberately: it synchronously
 * triggers `reporting`'s listener, which already retries each of its three mails independently. Retrying
 * the whole publish again from here would re-invoke that listener from scratch and risk re-sending mails
 * that already succeeded on a prior attempt.
 *
 * Publishing [DistributionClosedEvent] only *after* the transaction returns (not from inside it)
 * matters: `reporting`'s listener runs synchronously, so publishing from inside the transaction would
 * let it react - and send mail - based on data that might still roll back if the commit itself failed.
 *
 * Being `@Async` on an `@EventListener` works without any self-invocation caveat here, since
 * `DistributionService` (the publisher) and `DistributionEndedEventListener` (the listener) are
 * different beans - Spring's proxy for this bean intercepts the call and dispatches it to the async
 * executor, returning immediately.
 */
@Service
class DistributionEndedEventListener(
    private val distributionStatisticService: DistributionStatisticService,
    private val missingCostContributionService: MissingCostContributionService,
    private val transactionTemplate: TransactionTemplate,
    private val distributionRepository: DistributionRepository,
    private val eventPublisher: ApplicationEventPublisher,
    private val retryTemplate: RetryTemplate,
) {
    companion object {
        private val logger = LoggerFactory.getLogger(DistributionEndedEventListener::class.java)
    }

    @Async
    @EventListener
    fun onDistributionEnded(event: DistributionEndedEvent) {
        val distributionId = event.distributionId

        try {
            retryTemplate.execute<Unit, Exception> { context ->
                if (context.retryCount > 0) {
                    logger.warn("Retrying distribution post-processing (attempt #${context.retryCount + 1}) ...")
                }

                transactionTemplate.executeWithoutResult {
                    // Re-fetch in this transaction's persistence context to ensure lazy associations work properly
                    // The distribution passed here is from a committed REQUIRES_NEW transaction, so the fetch is safe
                    val distribution = distributionRepository.findById(distributionId).get()
                    distributionStatisticService.saveStatistic(distribution)
                    missingCostContributionService.addMissingCostContributions(distribution)
                }
            }
        } catch (e: Exception) {
            logger.error("Distribution post-processing failed after retrying", e)
            throw e
        }

        // Published only once the transaction above has committed - see the class doc for why.
        try {
            eventPublisher.publishEvent(DistributionClosedEvent(distributionId))
        } catch (e: Exception) {
            logger.error("Publishing DistributionClosedEvent failed", e)
            throw e
        }
    }
}
