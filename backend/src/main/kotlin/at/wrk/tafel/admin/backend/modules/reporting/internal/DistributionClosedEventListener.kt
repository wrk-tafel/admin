package at.wrk.tafel.admin.backend.modules.reporting.internal

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
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
import java.time.format.DateTimeFormatter

/**
 * Reacts to [DistributionClosedEvent] - published both right after a distribution closes and on a
 * manual mail resend (see `DistributionService.sendMails`) - by generating and emailing the daily
 * report PDF, the statistic CSV exports, and the return-boxes summary. A plain synchronous
 * [EventListener] rather than `@ApplicationModuleListener` on purpose: the manual resend path relies
 * on mail failures propagating back to the caller synchronously, which an async/after-commit listener
 * wouldn't allow.
 *
 * All three mails are isolated from each other (one retrying/failing never blocks another from being
 * attempted) and each is retried (via the shared `RetryTemplate` bean from `config.RetryConfig`) before
 * being given up on - mirroring the independence they used to have as separate `DistributionPostProcessor`
 * beans back when `distribution` ran them directly (the return-boxes mail never depended on `reporting`;
 * it moved here purely so all three mails share the same isolation/retry handling).
 * If any still fail after all retries, the first failure is rethrown (with the others attached as
 * suppressed exceptions) once all three have been attempted, so `DistributionService.sendMails()` still
 * surfaces a real error to the caller - the automatic post-close flow just logs and moves on, same as
 * `at.wrk.tafel.admin.backend.modules.distribution.internal.statistic.MissingCostContributionService`
 * does for its own failures.
 */
@Component
class DistributionClosedEventListener(
    private val distributionRepository: DistributionRepository,
    private val dailyReportService: DailyReportService,
    private val statisticExportService: StatisticExportService,
    private val mailSenderService: MailSenderService,
    private val retryTemplate: RetryTemplate,
) {
    companion object {
        private val logger = LoggerFactory.getLogger(DistributionClosedEventListener::class.java)
        private val DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
        private val DATE_FILENAME_FORMATTER = DateTimeFormatter.ofPattern("ddMMyyyy")
    }

    @EventListener
    fun onDistributionClosed(event: DistributionClosedEvent) {
        val distribution = distributionRepository.findByIdOrNull(event.distributionId) ?: return
        val statistic = distribution.statistic ?: return

        val failures = mutableListOf<Exception>()
        runIsolatedWithRetry("daily report mail", failures) { sendDailyReportMail(distribution, statistic) }
        runIsolatedWithRetry("statistic mail", failures) { sendStatisticMail(distribution, statistic) }
        runIsolatedWithRetry("return boxes mail", failures) { sendReturnBoxesMail(distribution) }

        failures.firstOrNull()?.let { first ->
            failures.drop(1).forEach { first.addSuppressed(it) }
            throw first
        }
    }

    private fun runIsolatedWithRetry(description: String, failures: MutableList<Exception>, block: () -> Unit) {
        try {
            retryTemplate.execute<Unit, Exception> { context ->
                if (context.retryCount > 0) {
                    logger.warn("Retrying $description (attempt #${context.retryCount + 1}) ...")
                }
                block()
            }
        } catch (e: Exception) {
            logger.error("Sending $description failed after retrying", e)
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

    private fun sendReturnBoxesMail(distribution: DistributionEntity) {
        val dateFormatted = distribution.startedAt!!.format(DATE_TIME_FORMATTER)

        val mailSubject = "TÖ Tafel 1030 - Retourkisten vom $dateFormatted"
        val returnBoxes = createReturnBoxesData(distribution)

        val ctx = Context()
        ctx.setVariable("distributionDate", dateFormatted)
        ctx.setVariable("returnBoxes", returnBoxes)
        ctx.setVariable("notes", distribution.notes)

        mailSenderService.sendHtmlMail(
            mailType = MailType.RETURN_BOXES,
            subject = mailSubject,
            attachments = emptyList(),
            templateName = "mails/return-boxes-mail",
            context = ctx,
        )

        logger.info("Mail for return boxes '$mailSubject' sent!")
    }

    /**
     * Builds the route -> shop -> return-category hierarchy for the mail by re-filtering
     * `distribution.foodCollections` at each nesting level (by route, then by route+shop) rather
     * than grouping once, and drops any route/shop with no return items via `null` filtering. Not
     * the cheapest possible approach, but distribution-sized data volumes make this fine, and it
     * keeps each level's filter self-contained.
     */
    private fun createReturnBoxesData(distribution: DistributionEntity): ReturnBoxesDataModel {
        val uniqueRoutes = distribution.foodCollections.mapNotNull { it.route }
            .distinctBy { it.id }
            .sortedBy { it.name }

        val routes = uniqueRoutes.mapNotNull { route ->
            val uniqueShopsPerRoute = distribution.foodCollections.asSequence()
                .filter { it.route!!.id == route.id }
                .flatMap { it.items ?: emptyList() }
                .mapNotNull { it.shop }
                .distinctBy { it.id }
                .sortedBy { it.name }
                .toList()

            val shops = uniqueShopsPerRoute.mapNotNull { shop ->
                val uniqueReturnCategories = distribution.foodCollections
                    .asSequence()
                    .filter { it.route!!.id == route.id }
                    .flatMap { it.items ?: emptyList() }
                    .mapNotNull { it.category }
                    .filter { it.returnItem == true }
                    .distinctBy { it.id }
                    .sortedBy { it.name }
                    .toList()

                val returnBoxes = uniqueReturnCategories.mapNotNull { category ->
                    val amount = distribution.foodCollections.flatMap { it.items ?: emptyList() }
                        .filter { it.shop!!.id == shop.id }
                        .filter { it.category!!.id == category.id }
                        .sumOf { it.amount ?: 0 }

                    if (amount > 0) "${amount}x ${category.name}" else null
                }.joinToString(", ")

                if (returnBoxes.trim().isNotEmpty()) {
                    val address = listOfNotNull(
                        shop.address?.street,
                        shop.address?.postalCode,
                        shop.address?.city,
                    )
                        .joinToString(", ")
                        .ifEmpty { "" }

                    ReturnBoxesShop(
                        name = "${shop.number} ${shop.name}",
                        address = address,
                        returnBoxes = returnBoxes,
                    )
                } else {
                    null
                }
            }

            if (shops.isNotEmpty()) {
                ReturnBoxesRoute(
                    name = route.name!!,
                    shops = shops,
                )
            } else {
                null
            }
        }

        return ReturnBoxesDataModel(
            routes = routes,
        )
    }
}

@ExcludeFromTestCoverage
data class ReturnBoxesDataModel(
    val routes: List<ReturnBoxesRoute>,
)

@ExcludeFromTestCoverage
data class ReturnBoxesRoute(
    val name: String,
    val shops: List<ReturnBoxesShop>,
)

@ExcludeFromTestCoverage
data class ReturnBoxesShop(
    val name: String,
    val address: String,
    val returnBoxes: String,
)
