package at.wrk.tafel.admin.backend.modules.reporting.internal

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.mail.MailAttachment
import at.wrk.tafel.admin.backend.common.mail.MailSenderService
import at.wrk.tafel.admin.backend.database.model.base.MailType
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.database.model.logistics.FoodReturnCategoryRepository
import at.wrk.tafel.admin.backend.modules.distribution.events.DistributionClosedEvent
import at.wrk.tafel.admin.backend.modules.reporting.DailyReportService
import at.wrk.tafel.admin.backend.modules.reporting.StatisticExportService
import at.wrk.tafel.admin.backend.modules.reporting.events.ReportMailFailedEvent
import org.slf4j.LoggerFactory
import org.springframework.context.ApplicationEventPublisher
import org.springframework.context.event.EventListener
import org.springframework.core.io.ByteArrayResource
import org.springframework.data.repository.findByIdOrNull
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.transaction.support.TransactionTemplate
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
 * All three mails are isolated from each other - one failing never blocks another from being attempted,
 * mirroring the independence they used to have as separate `DistributionPostProcessor` beans back when
 * `distribution` ran them directly (the return-boxes mail never depended on `reporting`; it moved here
 * purely so all three mails share the same isolation handling). If any fail, the first failure is
 * rethrown (with the others attached as suppressed exceptions) once all three have been attempted, so
 * `DistributionService.sendMails()` still surfaces a real error to the caller - the automatic post-close
 * flow just logs and moves on, same as
 * `at.wrk.tafel.admin.backend.modules.distribution.internal.statistic.MissingCostContributionService`
 * does for its own failures.
 *
 * **Each mail gets its own transaction**, opened here via `TransactionTemplate` rather than by annotating
 * the whole listener, and two things force that:
 * - A transaction is needed at all because `distribution` is fetched via the repository, whose own
 *   transaction closes as soon as the fetch returns - `distribution.households`/`.foodCollections` (both
 *   lazy) would otherwise throw `LazyInitializationException` the moment they're accessed. Hence the
 *   re-fetch inside each transaction, the same way `DistributionEndedEventListener` does it.
 * - It has to be *one transaction per mail*, and read-write, because composing a mail now queues it in
 *   `mail_outbox` ([MailSenderService]) instead of handing it to SMTP. Under one shared transaction the
 *   final rethrow would roll back the mails that were queued successfully, so a single failing mail
 *   would silently cancel its two healthy siblings - isolation in name only. A read-only transaction
 *   would fail outright, since queuing a mail is a write.
 *
 * There is no retry here any more: what is left inside a transaction is rendering a PDF/CSV and writing
 * a row, and neither gets better on a second identical attempt. Retrying the *delivery* - the part that
 * genuinely fails transiently, because it talks to a mail server - is `MailOutboxService`'s job, on a
 * backoff and long after this method has returned. [ReportMailFailedEvent] therefore now reports a mail
 * that could not be *built*; a mail that could not be *delivered* is reported by `MailOutboxService`
 * itself, via `MailDeliveryFailedEvent`.
 */
@Component
class DistributionClosedEventListener(
    private val distributionRepository: DistributionRepository,
    private val foodReturnCategoryRepository: FoodReturnCategoryRepository,
    private val dailyReportService: DailyReportService,
    private val statisticExportService: StatisticExportService,
    private val mailSenderService: MailSenderService,
    private val transactionTemplate: TransactionTemplate,
    private val eventPublisher: ApplicationEventPublisher,
) {
    companion object {
        private val logger = LoggerFactory.getLogger(DistributionClosedEventListener::class.java)
        private val DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
        private val DATE_FILENAME_FORMATTER = DateTimeFormatter.ofPattern("ddMMyyyy")
    }

    @EventListener
    fun onDistributionClosed(event: DistributionClosedEvent) {
        val distributionId = event.distributionId
        val failures = mutableListOf<Exception>()

        queueIsolated("daily report mail", "Tagesreport", distributionId, failures, ::sendDailyReportMail)
        queueIsolated("statistic mail", "Statistiken", distributionId, failures, ::sendStatisticMail)
        queueIsolated("return boxes mail", "Retourkisten", distributionId, failures) { distribution, _ ->
            sendReturnBoxesMail(distribution)
        }

        failures.firstOrNull()?.let { first ->
            failures.drop(1).forEach { first.addSuppressed(it) }
            throw first
        }
    }

    /**
     * Runs one mail's composing in a transaction of its own (see the class doc) and keeps its failure
     * to itself. [description] names the mail in the log; [reportName] names it to people, in the
     * [ReportMailFailedEvent] published when it fails. That event is published per failed mail and
     * before the collected failures are rethrown, so a mail that fails while a later one succeeds is
     * still reported - and so the notification goes out on the automatic post-close path too, which
     * swallows the rethrown exception.
     *
     * A distribution that has since disappeared, or one without a statistics snapshot, means there is
     * nothing to report on - not a failure, so it is skipped silently rather than counted as one.
     */
    private fun queueIsolated(
        description: String,
        reportName: String,
        distributionId: Long,
        failures: MutableList<Exception>,
        block: (DistributionEntity, DistributionStatisticEntity) -> Unit,
    ) {
        try {
            transactionTemplate.executeWithoutResult {
                val distribution = distributionRepository.findByIdOrNull(distributionId) ?: return@executeWithoutResult
                val statistic = distribution.statistic ?: return@executeWithoutResult
                block(distribution, statistic)
            }
        } catch (e: Exception) {
            logger.error("Queuing $description failed", e)
            failures += e
            eventPublisher.publishEvent(ReportMailFailedEvent(distributionId = distributionId, reportName = reportName))
        }
    }

    private fun sendDailyReportMail(distribution: DistributionEntity, statistic: DistributionStatisticEntity) {
        if (distribution.households.isEmpty()) {
            logger.warn("Skipped daily report because there are no customers registered!")
            return
        }

        val pdfReportBytes = dailyReportService.generateDailyReportPdf(statistic)

        val dateFormatted = distribution.startedAt.format(DATE_TIME_FORMATTER)
        val dateFilenameFormatted = distribution.startedAt.format(DATE_FILENAME_FORMATTER)

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
        logger.info("Mail with daily report '$mailSubject' - file: '$filename' queued!")
    }

    private fun sendStatisticMail(distribution: DistributionEntity, statistic: DistributionStatisticEntity) {
        val statisticExportFiles = statisticExportService.exportStatisticFiles(statistic)

        val dateFormatted = distribution.startedAt.format(DATE_TIME_FORMATTER)

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

        logger.info("Mail with statistic files '$mailSubject' queued!")
    }

    private fun sendReturnBoxesMail(distribution: DistributionEntity) {
        val dateFormatted = distribution.startedAt.format(DATE_TIME_FORMATTER)

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

        logger.info("Mail for return boxes '$mailSubject' queued!")
    }

    /**
     * Builds the route -> shop -> return-box hierarchy for the mail by re-filtering
     * `distribution.foodCollections` at each nesting level (by route, then by route+shop) rather
     * than grouping once, and drops any route/shop with no return items via `null` filtering. Not
     * the cheapest possible approach, but distribution-sized data volumes make this fine, and it
     * keeps each level's filter self-contained.
     *
     * Return boxes are free-text (`FoodCollectionEntity.returnItems`), so the shops considered here
     * come from those rows alone - a shop whose only recorded data is return boxes still has to
     * show up in the mail.
     *
     * Within a shop, boxes are listed in the order the return categories are maintained in
     * (`food_return_categories.sort_order`) so the mail reads the same way the recording screen
     * does; anything typed in free-text has no category and is appended alphabetically after them.
     */
    private fun createReturnBoxesData(distribution: DistributionEntity): ReturnBoxesDataModel {
        val returnCategoryOrder = foodReturnCategoryRepository.findAll()
            .associate { it.name to it.sortOrder }

        val uniqueRoutes = distribution.foodCollections.mapNotNull { it.route }
            .distinctBy { it.id }
            .sortedBy { it.name }

        val routes = uniqueRoutes.mapNotNull { route ->
            val uniqueShopsPerRoute = distribution.foodCollections.asSequence()
                .filter { it.route.id == route.id }
                .flatMap { it.returnItems ?: emptyList() }
                .mapNotNull { it.shop }
                .distinctBy { it.id }
                .sortedBy { it.name }
                .toList()

            val shops = uniqueShopsPerRoute.mapNotNull { shop ->
                val uniqueDescriptions = distribution.foodCollections
                    .asSequence()
                    .filter { it.route.id == route.id }
                    .flatMap { it.returnItems ?: emptyList() }
                    .filter { it.shop.id == shop.id }
                    .map { it.description }
                    .distinct()
                    .sortedWith(
                        compareBy(
                            { returnCategoryOrder[it] ?: Int.MAX_VALUE },
                            { it },
                        ),
                    )
                    .toList()

                val returnBoxes = uniqueDescriptions.mapNotNull { description ->
                    val amount = distribution.foodCollections.flatMap { it.returnItems ?: emptyList() }
                        .filter { it.shop.id == shop.id }
                        .filter { it.description == description }
                        .sumOf { it.amount }

                    if (amount > 0) "${amount}x $description" else null
                }.joinToString(", ")

                if (returnBoxes.trim().isNotEmpty()) {
                    val address = listOfNotNull(
                        shop.address.street,
                        shop.address.postalCode,
                        shop.address.city,
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
                    name = route.name,
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
