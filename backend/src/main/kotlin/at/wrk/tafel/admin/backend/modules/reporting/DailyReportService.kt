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

@Service
class DailyReportService(
    private val pdfService: PDFService,
    private val distributionStatisticRepository: DistributionStatisticRepository
) {

    fun generateDailyReportPdf(): ByteArray {
        // TODO add query
        val currentStatistic =
            distributionStatisticRepository.findAll().firstOrNull()
                ?: throw TafelValidationException("Keine Statistik gefunden!")

        val pdfModel = createPdfModel(currentStatistic)
        return pdfService.generatePdf(pdfModel, "/pdf-templates/daily-report/dailyreport-document.xsl")
    }

    private fun createPdfModel(currentStatistic: DistributionStatisticEntity): DailyReportPdfModel {
        val logoBytes =
            IOUtils.toByteArray(javaClass.getResourceAsStream("/pdf-templates/common/img/toet-logo.png"))
        return DailyReportPdfModel(
            logoContentType = MimeTypeUtils.IMAGE_PNG_VALUE,
            logoBytes = logoBytes,
            countCustomers = currentStatistic.countCustomers!!,
            countPersons = currentStatistic.countPersons!!,
            countInfants = currentStatistic.countInfants!!,
            averagePersonsPerCustomer = currentStatistic.averagePersonsPerCustomer!!,
            countCustomersNew = currentStatistic.countCustomersNew!!,
            countCustomersProlonged = currentStatistic.countCustomersProlonged!!,
            countCustomersUpdated = currentStatistic.countCustomersUpdated!!
        )
    }

}

@JacksonXmlRootElement(localName = "data")
@ExcludeFromTestCoverage
data class DailyReportPdfModel(
    val logoContentType: String,
    val logoBytes: ByteArray,
    val countCustomers: Int,
    val countPersons: Int,
    val countInfants: Int,
    val averagePersonsPerCustomer: BigDecimal,
    val countCustomersNew: Int,
    val countCustomersProlonged: Int,
    val countCustomersUpdated: Int
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as DailyReportPdfModel

        if (logoContentType != other.logoContentType) return false
        if (!logoBytes.contentEquals(other.logoBytes)) return false
        if (countCustomers != other.countCustomers) return false
        if (countPersons != other.countPersons) return false
        if (countInfants != other.countInfants) return false
        if (averagePersonsPerCustomer != other.averagePersonsPerCustomer) return false
        if (countCustomersNew != other.countCustomersNew) return false
        if (countCustomersProlonged != other.countCustomersProlonged) return false
        if (countCustomersUpdated != other.countCustomersUpdated) return false

        return true
    }

    override fun hashCode(): Int {
        var result = logoContentType.hashCode()
        result = 31 * result + logoBytes.contentHashCode()
        result = 31 * result + countCustomers
        result = 31 * result + countPersons
        result = 31 * result + countInfants
        result = 31 * result + averagePersonsPerCustomer.hashCode()
        result = 31 * result + countCustomersNew
        result = 31 * result + countCustomersProlonged
        result = 31 * result + countCustomersUpdated
        return result
    }
}

// TODO REMOVE
fun main() {
    val pdfService = PDFService()

    val logoBytes =
        IOUtils.toByteArray(DailyReportService::class.java.getResourceAsStream("/pdf-templates/common/img/toet-logo.png"))
    val model = DailyReportPdfModel(
        logoContentType = MimeTypeUtils.IMAGE_PNG_VALUE,
        logoBytes = logoBytes,
        countCustomers = 50,
        countPersons = 125,
        countInfants = 40,
        averagePersonsPerCustomer = BigDecimal("2.5"),
        countCustomersNew = 4,
        countCustomersProlonged = 6,
        countCustomersUpdated = 8
    )

    val pdfBytes = pdfService.generatePdf(model, "/pdf-templates/daily-report/dailyreport-document.xsl")

    IOUtils.write(pdfBytes, FileOutputStream(File("D:\\test.pdf")))
}
// TODO REMOVE
