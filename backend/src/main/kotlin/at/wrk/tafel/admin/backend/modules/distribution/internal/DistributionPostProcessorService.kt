package at.wrk.tafel.admin.backend.modules.distribution.internal

import at.wrk.tafel.admin.backend.common.mail.MailAttachment
import at.wrk.tafel.admin.backend.common.mail.MailSenderService
import at.wrk.tafel.admin.backend.config.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.modules.distribution.internal.statistic.DistributionStatisticService
import at.wrk.tafel.admin.backend.modules.reporting.DailyReportService
import at.wrk.tafel.admin.backend.modules.reporting.StatisticExportFile
import at.wrk.tafel.admin.backend.modules.reporting.StatisticExportService
import org.slf4j.LoggerFactory
import org.springframework.core.io.ByteArrayResource
import org.springframework.http.MediaType
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Service
import org.springframework.transaction.support.TransactionTemplate
import java.time.LocalDate
import java.time.format.DateTimeFormatter

@Service
class DistributionPostProcessorService(
    private val distributionStatisticService: DistributionStatisticService,
    private val dailyReportService: DailyReportService,
    private val mailSenderService: MailSenderService,
    private val transactionTemplate: TransactionTemplate,
    private val distributionRepository: DistributionRepository,
    private val tafelAdminProperties: TafelAdminProperties,
    private val statisticExportService: StatisticExportService
) {
    companion object {
        private val logger = LoggerFactory.getLogger(DistributionPostProcessorService::class.java)
    }

    @Async
    fun process(distributionId: Long) {
        transactionTemplate.executeWithoutResult {
            val distribution = distributionRepository.findById(distributionId).get()
            val statistic = distributionStatisticService.createAndSaveStatistic(distribution)

            // Send daily report
            if (distribution.customers.isNotEmpty()) {
                val pdfReportBytes = dailyReportService.generateDailyReportPdf(statistic)
                sendDailyReportMail(pdfReportBytes)
            } else {
                logger.warn("Skipped daily report because there are no customers registered!")
            }

            // Export statistic files and send per mail
            val statisticExportFiles = statisticExportService.exportStatisticFiles(statistic)
            sendStatisticMail(statisticExportFiles)
        }
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
                contentType = MediaType.APPLICATION_PDF_VALUE
            )
        )

        mailSenderService.sendMail(
            tafelAdminProperties.mail!!.dailyreport!!,
            mailSubject,
            mailText,
            attachment
        )
        logger.info("Daily report '$mailSubject' - file: '$filename' sent!")
    }

    private fun sendStatisticMail(statisticExportFiles: List<StatisticExportFile>) {
        val dateFormatted = LocalDate.now().format(DateTimeFormatter.ofPattern("dd.MM.yyyy"))

        val mailSubject = "TÖ Tafel 1030 - Statistiken vom $dateFormatted"
        val mailText = "Details im Anhang"
        val attachments = statisticExportFiles.map {
            MailAttachment(
                filename = it.name,
                inputStreamSource = ByteArrayResource(it.content),
                contentType = "text/csv"
            )
        }

        mailSenderService.sendMail(
            tafelAdminProperties.mail!!.statistic!!,
            mailSubject,
            mailText,
            attachments
        )
        logger.info("Statistic-Files '$mailSubject' sent!")
    }

}
