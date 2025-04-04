package at.wrk.tafel.admin.backend.modules.distribution.internal.postprocessors

import at.wrk.tafel.admin.backend.common.mail.MailAttachment
import at.wrk.tafel.admin.backend.common.mail.MailSenderService
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.base.MailType
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.modules.reporting.StatisticExportFile
import at.wrk.tafel.admin.backend.modules.reporting.StatisticExportService
import org.slf4j.LoggerFactory
import org.springframework.core.io.ByteArrayResource
import org.springframework.stereotype.Component
import org.thymeleaf.context.Context
import java.time.LocalDate
import java.time.format.DateTimeFormatter

@Component
class StatisticMailPostProcessor(
    private val tafelAdminProperties: TafelAdminProperties,
    private val mailSenderService: MailSenderService,
    private val statisticExportService: StatisticExportService,
) : DistributionPostProcessor {

    companion object {
        private val logger = LoggerFactory.getLogger(StatisticMailPostProcessor::class.java)
        private val DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
    }

    override fun process(distribution: DistributionEntity, statistic: DistributionStatisticEntity) {
        val statisticExportFiles = statisticExportService.exportStatisticFiles(statistic)
        sendStatisticMail(distribution, statisticExportFiles)
    }

    private fun sendStatisticMail(distribution: DistributionEntity, statisticExportFiles: List<StatisticExportFile>) {
        val dateFormatted = LocalDate.now().format(DATE_TIME_FORMATTER)

        val mailSubject = "TÖ Tafel 1030 - Statistiken vom $dateFormatted"
        val attachments = statisticExportFiles.map {
            MailAttachment(
                filename = it.name,
                inputStreamSource = ByteArrayResource(it.content),
                contentType = "text/csv"
            )
        }

        val ctx = Context()
        ctx.setVariable("distributionDate", distribution.startedAt!!.format(DATE_TIME_FORMATTER))

        mailSenderService.sendHtmlMail(
            mailType = MailType.STATISTICS,
            subject = mailSubject,
            attachments = attachments,
            templateName = "mails/statistic-mail",
            context = ctx
        )

        logger.info("Mail with statistic files '$mailSubject' sent!")
    }

}
