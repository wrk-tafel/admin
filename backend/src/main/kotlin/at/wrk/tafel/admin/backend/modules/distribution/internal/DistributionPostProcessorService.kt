package at.wrk.tafel.admin.backend.modules.distribution.internal

import at.wrk.tafel.admin.backend.common.mail.MailAttachment
import at.wrk.tafel.admin.backend.common.mail.MailSenderService
import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.modules.distribution.internal.statistic.DistributionStatisticService
import at.wrk.tafel.admin.backend.modules.reporting.DailyReportService
import org.slf4j.LoggerFactory
import org.springframework.core.io.ByteArrayResource
import org.springframework.stereotype.Service
import java.time.LocalDate
import java.time.format.DateTimeFormatter

@Service
class DistributionPostProcessorService(
    private val distributionStatisticService: DistributionStatisticService,
    private val dailyReportService: DailyReportService,
    private val mailSenderService: MailSenderService
) {
    companion object {
        private val logger = LoggerFactory.getLogger(DistributionPostProcessorService::class.java)
    }

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
        val filename = "tagesreport_${dateFilenameFormatted}.pdf"
        val attachment = listOf(
            MailAttachment(
                filename = filename,
                inputStreamSource = ByteArrayResource(pdfReportBytes),
                contentType = "application/pdf"
            )
        )

        mailSenderService.sendMail(mailSubject, mailText, attachment)
        logger.info("Daily report '$mailSubject' - file: '$filename' sent!")
    }

}