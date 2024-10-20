package at.wrk.tafel.admin.backend.modules.reporting.service.internal

import at.wrk.tafel.admin.backend.common.events.DistributionClosedEvent
import at.wrk.tafel.admin.backend.common.mail.MailAttachment
import at.wrk.tafel.admin.backend.common.mail.MailSenderService
import at.wrk.tafel.admin.backend.common.pdf.PDFService
import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.database.repositories.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.repositories.distribution.DistributionStatisticRepository
import at.wrk.tafel.admin.backend.modules.reporting.service.internal.model.DailyReportPdfModel
import org.apache.commons.io.IOUtils
import org.slf4j.LoggerFactory
import org.springframework.core.io.ByteArrayResource
import org.springframework.modulith.events.ApplicationModuleListener
import org.springframework.stereotype.Service
import org.springframework.util.MimeTypeUtils
import java.time.LocalDate
import java.time.format.DateTimeFormatter

@Service
class DailyReportInternalService(
    private val pdfService: PDFService,
    private val mailSenderService: MailSenderService,
    private val distributionRepository: DistributionRepository,
    private val distributionStatisticRepository: DistributionStatisticRepository
) {
    companion object {
        private val DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
        private val DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm")
        private val logger = LoggerFactory.getLogger(DailyReportInternalService::class.java)
    }

    @ApplicationModuleListener
    fun processDistributionClosed(event: DistributionClosedEvent) {
        val distributionId = event.distributionId
        val distribution = distributionRepository.findById(distributionId).get()

        if (distribution.customers.isNotEmpty()) {
            val statistic = distributionStatisticRepository.findByDistributionId(distributionId)
            val pdfReportBytes = generateDailyReportPdf(statistic)
            sendDailyReportMail(pdfReportBytes)
        } else {
            logger.warn("Skipped daily report because no customers are registered!")
        }
    }

    fun generateDailyReportPdf(distributionStatistic: DistributionStatisticEntity): ByteArray {
        val pdfModel = createPdfModel(distributionStatistic)
        return pdfService.generatePdf(pdfModel, "/pdf-templates/daily-report/dailyreport-document.xsl")
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

    private fun createPdfModel(statistic: DistributionStatisticEntity): DailyReportPdfModel {
        val logoBytes =
            IOUtils.toByteArray(javaClass.getResourceAsStream("/pdf-templates/common/img/toet-logo.png"))
        return DailyReportPdfModel(
            logoContentType = MimeTypeUtils.IMAGE_PNG_VALUE,
            logoBytes = logoBytes,
            date = formatDate(statistic),
            countCustomers = statistic.countCustomers!!,
            countPersons = statistic.countPersons!!,
            countInfants = statistic.countInfants!!,
            averagePersonsPerCustomer = statistic.averagePersonsPerCustomer!!,
            countCustomersNew = statistic.countCustomersNew!!,
            countPersonsNew = statistic.countPersonsNew!!,
            countCustomersProlonged = statistic.countCustomersProlonged!!,
            countPersonsProlonged = statistic.countPersonsProlonged!!,
            countCustomersUpdated = statistic.countCustomersUpdated!!
        )
    }

    private fun formatDate(statistic: DistributionStatisticEntity): String {
        val date = statistic.distribution?.startedAt?.toLocalDate()?.format(DATE_FORMATTER)
        val startTime = statistic.distribution?.startedAt?.format(DATE_TIME_FORMATTER)
        val endTime = statistic.distribution?.endedAt?.format(DATE_TIME_FORMATTER)
        return "$date $startTime - $endTime"
    }

}
