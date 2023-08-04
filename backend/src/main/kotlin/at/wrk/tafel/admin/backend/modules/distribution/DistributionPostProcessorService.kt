package at.wrk.tafel.admin.backend.modules.distribution

import at.wrk.tafel.admin.backend.common.mail.MailSenderService
import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.modules.distribution.statistic.DistributionStatisticService
import at.wrk.tafel.admin.backend.modules.reporting.DailyReportService
import org.springframework.stereotype.Service
import java.time.LocalDate
import java.time.format.DateTimeFormatter

@Service
class DistributionPostProcessorService(
    private val distributionStatisticService: DistributionStatisticService,
    private val dailyReportService: DailyReportService,
    private val mailSenderService: MailSenderService
) {

    fun process(distribution: DistributionEntity) {
        val statistic = distributionStatisticService.createAndSaveStatistic(distribution)

        val pdfReportBytes = dailyReportService.generateDailyReportPdf(statistic)
        sendDailyReportMail(pdfReportBytes)
    }

    private fun sendDailyReportMail(pdfReportBytes: ByteArray) {
        // TODO attach file
        val mailSubject = "Tage-Report ${LocalDate.now().format(DateTimeFormatter.ofPattern("dd.MM.yyyy"))}"
        val mailText = "TEST"
        mailSenderService.sendTextMail(mailSubject, mailText)
    }

}
