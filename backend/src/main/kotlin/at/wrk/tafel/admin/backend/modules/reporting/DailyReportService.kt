package at.wrk.tafel.admin.backend.modules.reporting

import at.wrk.tafel.admin.backend.common.pdf.PDFService
import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.database.repositories.distribution.DistributionStatisticRepository
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import org.springframework.stereotype.Service
import java.math.BigDecimal

@Service
class DailyReportService(
    private val pdfService: PDFService,
    private val distributionStatisticRepository: DistributionStatisticRepository
) {

    fun generateDailyReportPdf(): ByteArray {
        val currentStatistic =
            distributionStatisticRepository.findFirstByDistributionEndedAtIsNullOrderByStartedAtDesc()
                ?: throw TafelValidationException("Keine Statistik gefunden!")

        val pdfModel = createPdfModel(currentStatistic)
        return pdfService.generatePdf(pdfModel, "/pdf-templates/daily-report/dailyreport-document.xsl")
    }

    private fun createPdfModel(currentStatistic: DistributionStatisticEntity): DailyReportPdfModel {
        return DailyReportPdfModel(
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

data class DailyReportPdfModel(
    val countCustomers: Int,
    val countPersons: Int,
    val countInfants: Int,
    val averagePersonsPerCustomer: BigDecimal,
    val countCustomersNew: Int,
    val countCustomersProlonged: Int,
    val countCustomersUpdated: Int
)
