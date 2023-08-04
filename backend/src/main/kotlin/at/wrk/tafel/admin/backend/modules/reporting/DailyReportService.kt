package at.wrk.tafel.admin.backend.modules.reporting

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.pdf.PDFService
import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.database.repositories.distribution.DistributionStatisticRepository
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlRootElement
import org.apache.commons.io.IOUtils
import org.springframework.stereotype.Service
import org.springframework.util.MimeTypeUtils
import java.io.File
import java.io.FileOutputStream
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

@Service
class DailyReportService(
    private val pdfService: PDFService,
    private val distributionStatisticRepository: DistributionStatisticRepository
) {
    companion object {
        private val DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
        private val DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:MM")
    }

    fun generateDailyReportPdf(): ByteArray {
        // TODO add query
        val currentStatistic =
            distributionStatisticRepository.findAll().firstOrNull()
                ?: throw TafelValidationException("Keine Statistik gefunden!")

        val pdfModel = createPdfModel(currentStatistic)
        return pdfService.generatePdf(pdfModel, "/pdf-templates/daily-report/dailyreport-document.xsl")
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
        val date = LocalDate.now().format(DATE_FORMATTER)
        val startTime = statistic.distribution?.startedAt?.format(DATE_TIME_FORMATTER)
        val endTime = statistic.distribution?.endedAt?.format(DATE_TIME_FORMATTER)
        return "$date $startTime - $endTime"
    }

}

@JacksonXmlRootElement(localName = "data")
@ExcludeFromTestCoverage
data class DailyReportPdfModel(
    val logoContentType: String,
    val logoBytes: ByteArray,
    val date: String,
    val countCustomers: Int,
    val countPersons: Int,
    val countInfants: Int,
    val averagePersonsPerCustomer: BigDecimal,
    val countCustomersNew: Int,
    val countPersonsNew: Int,
    val countCustomersProlonged: Int,
    val countPersonsProlonged: Int,
    val countCustomersUpdated: Int
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as DailyReportPdfModel

        if (logoContentType != other.logoContentType) return false
        if (!logoBytes.contentEquals(other.logoBytes)) return false
        if (date != other.date) return false
        if (countCustomers != other.countCustomers) return false
        if (countPersons != other.countPersons) return false
        if (countInfants != other.countInfants) return false
        if (averagePersonsPerCustomer != other.averagePersonsPerCustomer) return false
        if (countCustomersNew != other.countCustomersNew) return false
        if (countPersonsNew != other.countPersonsNew) return false
        if (countCustomersProlonged != other.countCustomersProlonged) return false
        if (countPersonsProlonged != other.countPersonsProlonged) return false
        if (countCustomersUpdated != other.countCustomersUpdated) return false

        return true
    }

    override fun hashCode(): Int {
        var result = logoContentType.hashCode()
        result = 31 * result + logoBytes.contentHashCode()
        result = 31 * result + date.hashCode()
        result = 31 * result + countCustomers
        result = 31 * result + countPersons
        result = 31 * result + countInfants
        result = 31 * result + averagePersonsPerCustomer.hashCode()
        result = 31 * result + countCustomersNew
        result = 31 * result + countPersonsNew
        result = 31 * result + countCustomersProlonged
        result = 31 * result + countPersonsProlonged
        result = 31 * result + countCustomersUpdated
        return result
    }

}

// TODO REMOVE
fun main() {
    val pdfService = PDFService()

    val DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
    val DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:MM")

    val date = LocalDate.now().format(DATE_FORMATTER)
    val startTime = LocalDateTime.now().minusHours(5).format(DATE_TIME_FORMATTER)
    val endTime = LocalDateTime.now().minusHours(1).format(DATE_TIME_FORMATTER)

    val logoBytes =
        IOUtils.toByteArray(DailyReportService::class.java.getResourceAsStream("/pdf-templates/common/img/toet-logo.png"))
    val model = DailyReportPdfModel(
        logoContentType = MimeTypeUtils.IMAGE_PNG_VALUE,
        logoBytes = logoBytes,
        date = "$date $startTime - $endTime",
        countCustomers = 50,
        countPersons = 125,
        countInfants = 40,
        averagePersonsPerCustomer = BigDecimal("2.5"),
        countCustomersNew = 4,
        countPersonsNew = 5,
        countCustomersProlonged = 6,
        countPersonsProlonged = 7,
        countCustomersUpdated = 8
    )

    val pdfBytes = pdfService.generatePdf(model, "/pdf-templates/daily-report/dailyreport-document.xsl")

    IOUtils.write(pdfBytes, FileOutputStream(File("D:\\test.pdf")))
}
// TODO REMOVE
