package at.wrk.tafel.admin.backend.modules.reporting

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.pdf.PDFService
import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionStatisticEntity
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlRootElement
import org.apache.commons.io.IOUtils
import org.springframework.stereotype.Service
import org.springframework.util.MimeTypeUtils
import java.math.BigDecimal
import java.time.format.DateTimeFormatter

@Service
class DailyReportService(
    private val pdfService: PDFService
) {
    companion object {
        private val DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
        private val DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm")
    }

    fun generateDailyReportPdf(distributionStatistic: DistributionStatisticEntity): ByteArray {
        val pdfModel = createPdfModel(distributionStatistic)
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
        val date = statistic.distribution?.startedAt?.toLocalDate()?.format(DATE_FORMATTER)
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
