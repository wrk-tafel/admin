package at.wrk.tafel.admin.backend.modules.distribution

import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.modules.distribution.statistic.DistributionStatisticService
import at.wrk.tafel.admin.backend.modules.reporting.DailyReportService
import org.springframework.stereotype.Service

@Service
class DistributionPostProcessorService(
    private val distributionStatisticService: DistributionStatisticService,
    private val dailyReportService: DailyReportService
) {

    fun process(distribution: DistributionEntity) {
        val statistic = distributionStatisticService.createAndSaveStatistic(distribution)

        val pdfReportBytes = dailyReportService.generateDailyReportPdf(statistic)
        // TODO send mail
    }

}
