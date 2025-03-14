package at.wrk.tafel.admin.backend.modules.distribution.internal.postprocessors

import at.wrk.tafel.admin.backend.common.mail.MailAttachment
import at.wrk.tafel.admin.backend.common.mail.MailSenderService
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.modules.reporting.DailyReportService
import org.slf4j.LoggerFactory
import org.springframework.core.io.ByteArrayResource
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import java.time.LocalDate
import java.time.format.DateTimeFormatter

@Component
class DailyReportPostProcessor(
    private val tafelAdminProperties: TafelAdminProperties,
    private val dailyReportService: DailyReportService,
    private val mailSenderService: MailSenderService,
) : DistributionPostProcessor {

    companion object {
        private val logger = LoggerFactory.getLogger(DailyReportPostProcessor::class.java)
        private val DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
        private val DATE_FILENAME_FORMATTER = DateTimeFormatter.ofPattern("ddMMyyyy")
    }

    override fun process(distribution: DistributionEntity, statistic: DistributionStatisticEntity) {
        if (distribution.customers.isNotEmpty()) {
            val pdfReportBytes = dailyReportService.generateDailyReportPdf(statistic)
            sendMail(pdfReportBytes)
        } else {
            logger.warn("Skipped daily report because there are no customers registered!")
        }
    }

    private fun sendMail(pdfReportBytes: ByteArray) {
        val dateTitleFormatted = LocalDate.now().format(DATE_TIME_FORMATTER)
        val dateFilenameFormatted = LocalDate.now().format(DATE_FILENAME_FORMATTER)

        val mailSubject = "TÖ Tafel 1030 - Tages-Report vom $dateTitleFormatted"
        val mailText = "Details im Anhang"
        val filename = "tagesreport_${dateFilenameFormatted}.pdf"
        val attachment = listOf(
            MailAttachment(
                filename = filename,
                inputStreamSource = ByteArrayResource(pdfReportBytes),
                contentType = MediaType.APPLICATION_PDF_VALUE
            )
        )

        mailSenderService.sendMail(
            tafelAdminProperties.mail!!.dailyReport!!,
            mailSubject,
            mailText,
            attachment
        )
        logger.info("Mail with daily report '$mailSubject' - file: '$filename' sent!")
    }

}
