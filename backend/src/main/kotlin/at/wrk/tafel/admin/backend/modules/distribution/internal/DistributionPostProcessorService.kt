package at.wrk.tafel.admin.backend.modules.distribution.internal

import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.modules.distribution.internal.postprocessors.DistributionPostProcessor
import at.wrk.tafel.admin.backend.modules.distribution.internal.statistic.DistributionStatisticService
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Service
import org.springframework.transaction.support.TransactionTemplate

@Service
class DistributionPostProcessorService(
    private val distributionStatisticService: DistributionStatisticService,
    private val transactionTemplate: TransactionTemplate,
    private val distributionRepository: DistributionRepository,
    private val postProcessors: List<DistributionPostProcessor>,
) {
    companion object {
        private val logger = LoggerFactory.getLogger(DistributionPostProcessorService::class.java)
    }

    @Async
    fun process(distributionId: Long) {
        transactionTemplate.executeWithoutResult {
            val distribution = distributionRepository.findById(distributionId).get()
            val statistic = distributionStatisticService.createAndSaveStatistic(distribution)

            postProcessors.forEach {
                logger.info("Postprocessing - ${it.javaClass.simpleName} ... started")
                it.process(distribution, statistic)
                logger.info("Postprocessing - ${it.javaClass.simpleName} ... done")
            }
        }
    }

}
