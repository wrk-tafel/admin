package at.wrk.tafel.admin.backend.modules.distribution.internal.postprocessors

import at.wrk.tafel.admin.backend.common.mail.MailAttachment
import at.wrk.tafel.admin.backend.common.mail.MailSenderService
import at.wrk.tafel.admin.backend.database.model.base.MailType
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.modules.reporting.DailyReportService
import org.slf4j.LoggerFactory
import org.springframework.core.io.ByteArrayResource
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.thymeleaf.context.Context
import java.time.format.DateTimeFormatter

@Component
class DailyReportMailPostProcessor(
    private val dailyReportService: DailyReportService,
    private val mailSenderService: MailSenderService,
) : DistributionPostProcessor {

    companion object {
        private val logger = LoggerFactory.getLogger(DailyReportMailPostProcessor::class.java)
        private val DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
        private val DATE_FILENAME_FORMATTER = DateTimeFormatter.ofPattern("ddMMyyyy")
    }

    override fun process(distribution: DistributionEntity, statistic: DistributionStatisticEntity) {
        if (distribution.customers.isNotEmpty()) {
            val pdfReportBytes = dailyReportService.generateDailyReportPdf(statistic)
            sendMail(distribution, pdfReportBytes)
        } else {
            logger.warn("Skipped daily report because there are no customers registered!")
        }
    }

    private fun sendMail(distribution: DistributionEntity, pdfReportBytes: ByteArray) {
        val dateFormatted = distribution.startedAt!!.format(DATE_TIME_FORMATTER)
        val dateFilenameFormatted = distribution.startedAt!!.format(DATE_FILENAME_FORMATTER)

        val mailSubject = "TÖ Tafel 1030 - Tagesreport vom $dateFormatted"
        val filename = "tagesreport_${dateFilenameFormatted}.pdf"
        val attachment = listOf(
            MailAttachment(
                filename = filename,
                inputStreamSource = ByteArrayResource(pdfReportBytes),
                contentType = MediaType.APPLICATION_PDF_VALUE
            )
        )

        val ctx = Context()
        ctx.setVariable("distributionDate", dateFormatted)
        ctx.setVariable("notes", distribution.notes)

        mailSenderService.sendHtmlMail(
            MailType.DAILY_REPORT,
            mailSubject,
            attachment,
            "mails/daily-report-mail",
            ctx
        )
        logger.info("Mail with daily report '$mailSubject' - file: '$filename' sent!")
    }

}
