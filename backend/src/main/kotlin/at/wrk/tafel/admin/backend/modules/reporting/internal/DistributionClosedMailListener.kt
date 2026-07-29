package at.wrk.tafel.admin.backend.modules.reporting.internal

import at.wrk.tafel.admin.backend.common.mail.MailAttachment
import at.wrk.tafel.admin.backend.common.mail.MailSenderService
import at.wrk.tafel.admin.backend.database.model.base.MailType
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.modules.distribution.DistributionClosedEvent
import at.wrk.tafel.admin.backend.modules.reporting.DailyReportService
import at.wrk.tafel.admin.backend.modules.reporting.StatisticExportService
import org.slf4j.LoggerFactory
import org.springframework.context.event.EventListener
import org.springframework.core.io.ByteArrayResource
import org.springframework.data.repository.findByIdOrNull
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.thymeleaf.context.Context
import java.time.format.DateTimeFormatter

/**
 * Reacts to [DistributionClosedEvent] - published both right after a distribution closes and on a
 * manual mail resend (see `DistributionService.sendMails`) - by generating and emailing the daily
 * report PDF and the statistic CSV exports. A plain synchronous [EventListener] rather than
 * `@ApplicationModuleListener` on purpose: the manual resend path relies on mail failures
 * propagating back to the caller synchronously, which an async/after-commit listener wouldn't allow.
 */
@Component
class DistributionClosedMailListener(
    private val distributionRepository: DistributionRepository,
    private val dailyReportService: DailyReportService,
    private val statisticExportService: StatisticExportService,
    private val mailSenderService: MailSenderService,
) {
    companion object {
        private val logger = LoggerFactory.getLogger(DistributionClosedMailListener::class.java)
        private val DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
        private val DATE_FILENAME_FORMATTER = DateTimeFormatter.ofPattern("ddMMyyyy")
    }

    @EventListener
    fun onDistributionClosed(event: DistributionClosedEvent) {
        val distribution = distributionRepository.findByIdOrNull(event.distributionId) ?: return
        val statistic = distribution.statistic ?: return

        sendDailyReportMail(distribution, statistic)
        sendStatisticMail(distribution, statistic)
    }

    private fun sendDailyReportMail(distribution: DistributionEntity, statistic: DistributionStatisticEntity) {
        if (distribution.households.isEmpty()) {
            logger.warn("Skipped daily report because there are no customers registered!")
            return
        }

        val pdfReportBytes = dailyReportService.generateDailyReportPdf(statistic)

        val dateFormatted = distribution.startedAt!!.format(DATE_TIME_FORMATTER)
        val dateFilenameFormatted = distribution.startedAt!!.format(DATE_FILENAME_FORMATTER)

        val mailSubject = "TÖ Tafel 1030 - Tagesreport vom $dateFormatted"
        val filename = "tagesreport_$dateFilenameFormatted.pdf"
        val attachment = listOf(
            MailAttachment(
                filename = filename,
                inputStreamSource = ByteArrayResource(pdfReportBytes),
                contentType = MediaType.APPLICATION_PDF_VALUE,
            ),
        )

        val ctx = Context()
        ctx.setVariable("distributionDate", dateFormatted)
        ctx.setVariable("notes", distribution.notes)

        mailSenderService.sendHtmlMail(
            MailType.DAILY_REPORT,
            mailSubject,
            attachment,
            "mails/daily-report-mail",
            ctx,
        )
        logger.info("Mail with daily report '$mailSubject' - file: '$filename' sent!")
    }

    private fun sendStatisticMail(distribution: DistributionEntity, statistic: DistributionStatisticEntity) {
        val statisticExportFiles = statisticExportService.exportStatisticFiles(statistic)

        val dateFormatted = distribution.startedAt!!.format(DATE_TIME_FORMATTER)

        val mailSubject = "TÖ Tafel 1030 - Statistiken vom $dateFormatted"
        val attachments = statisticExportFiles.map {
            MailAttachment(
                filename = it.name,
                inputStreamSource = ByteArrayResource(it.content),
                contentType = "text/csv",
            )
        }

        val ctx = Context()
        ctx.setVariable("distributionDate", dateFormatted)

        mailSenderService.sendHtmlMail(
            mailType = MailType.STATISTICS,
            subject = mailSubject,
            attachments = attachments,
            templateName = "mails/statistic-mail",
            context = ctx,
        )

        logger.info("Mail with statistic files '$mailSubject' sent!")
    }
}
