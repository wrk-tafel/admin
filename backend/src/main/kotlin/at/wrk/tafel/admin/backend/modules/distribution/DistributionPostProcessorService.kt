package at.wrk.tafel.admin.backend.modules.distribution

import at.wrk.tafel.admin.backend.common.mail.MailAttachment
import at.wrk.tafel.admin.backend.common.mail.MailSenderService
import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.modules.distribution.statistic.DistributionStatisticService
import at.wrk.tafel.admin.backend.modules.reporting.DailyReportService
import org.springframework.core.io.ByteArrayResource
import org.springframework.scheduling.annotation.Async
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
        val dateTitleFormatted = LocalDate.now().format(DateTimeFormatter.ofPattern("dd.MM.yyyy"))
        val dateFilenameFormatted = LocalDate.now().format(DateTimeFormatter.ofPattern("ddMMyyyy"))

        val mailSubject = "TÖ Tafel 1030 - Tages-Report vom $dateTitleFormatted"
        val mailText = "Details im Anhang"
        val attachment = listOf(
            MailAttachment(
                filename = "tagesreport_${dateFilenameFormatted}.pdf",
                inputStreamSource = ByteArrayResource(pdfReportBytes),
                contentType = "application/pdf"
            )
        )
        mailSenderService.sendMail(mailSubject, mailText, attachment)
    }

}
