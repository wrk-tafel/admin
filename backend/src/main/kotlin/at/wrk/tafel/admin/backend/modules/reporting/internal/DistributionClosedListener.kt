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
import org.springframework.retry.support.RetryTemplate
import org.springframework.stereotype.Component
import org.thymeleaf.context.Context
import java.time.Duration
import java.time.format.DateTimeFormatter

/**
 * Reacts to [DistributionClosedEvent] - published both right after a distribution closes and on a
 * manual mail resend (see `DistributionService.sendMails`) - by generating and emailing the daily
 * report PDF and the statistic CSV exports. A plain synchronous [EventListener] rather than
 * `@ApplicationModuleListener` on purpose: the manual resend path relies on mail failures
 * propagating back to the caller synchronously, which an async/after-commit listener wouldn't allow.
 *
 * The two mails are isolated from each other (one retrying/failing never blocks the other from being
 * attempted) and each is retried [MAX_ATTEMPTS] times before being given up on - mirroring the
 * independence the two used to have as separate [at.wrk.tafel.admin.backend.modules.distribution.internal.postprocessors.DistributionPostProcessor]
 * beans, each wrapped in its own try/catch, before this module stopped depending on `reporting` directly.
 * If either still fails after all retries, that failure is rethrown (with any second failure attached
 * as a suppressed exception) once both have been attempted, so `DistributionService.sendMails()` still
 * surfaces a real error to the caller - the automatic post-close flow just logs and moves on, same as
 * every other [at.wrk.tafel.admin.backend.modules.distribution.internal.postprocessors.DistributionPostProcessor].
 */
@Component
class DistributionClosedListener(
    private val distributionRepository: DistributionRepository,
    private val dailyReportService: DailyReportService,
    private val statisticExportService: StatisticExportService,
    private val mailSenderService: MailSenderService,
    private val retryTemplate: RetryTemplate = defaultRetryTemplate(),
) {
    companion object {
        private val logger = LoggerFactory.getLogger(DistributionClosedListener::class.java)
        private val DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
        private val DATE_FILENAME_FORMATTER = DateTimeFormatter.ofPattern("ddMMyyyy")
        private const val MAX_ATTEMPTS = 3

        private fun defaultRetryTemplate(): RetryTemplate = RetryTemplate.builder()
            .maxAttempts(MAX_ATTEMPTS)
            .fixedBackoff(Duration.ofSeconds(2))
            .retryOn(Exception::class.java)
            .build()
    }

    @EventListener
    fun onDistributionClosed(event: DistributionClosedEvent) {
        val distribution = distributionRepository.findByIdOrNull(event.distributionId) ?: return
        val statistic = distribution.statistic ?: return

        val failures = mutableListOf<Exception>()
        runIsolatedWithRetry("daily report mail", failures) { sendDailyReportMail(distribution, statistic) }
        runIsolatedWithRetry("statistic mail", failures) { sendStatisticMail(distribution, statistic) }

        failures.firstOrNull()?.let { first ->
            failures.drop(1).forEach { first.addSuppressed(it) }
            throw first
        }
    }

    private fun runIsolatedWithRetry(description: String, failures: MutableList<Exception>, block: () -> Unit) {
        try {
            retryTemplate.execute<Unit, Exception> { context ->
                if (context.retryCount > 0) {
                    logger.warn("Retrying $description (attempt ${context.retryCount + 1}/$MAX_ATTEMPTS) ...")
                }
                block()
            }
        } catch (e: Exception) {
            logger.error("Sending $description failed after $MAX_ATTEMPTS attempts", e)
            failures += e
        }
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
