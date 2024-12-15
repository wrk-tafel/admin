package at.wrk.tafel.admin.backend.modules.reporting

import at.wrk.tafel.admin.backend.common.pdf.PDFService
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionStatisticEntity
import at.wrk.tafel.admin.backend.modules.reporting.internal.DailyReportPdfModel
import org.apache.commons.io.IOUtils
import org.springframework.stereotype.Service
import org.springframework.util.MimeTypeUtils
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

            employeeCount = statistic.employeeCount!!,
            personsInShelterCount = statistic.personsInShelterCount!!,

            countCustomers = statistic.countCustomers!!,
            countPersons = statistic.countPersons!!,
            countInfants = statistic.countInfants!!,
            averagePersonsPerCustomer = statistic.averagePersonsPerCustomer!!,
            countCustomersNew = statistic.countCustomersNew!!,
            countPersonsNew = statistic.countPersonsNew!!,
            countCustomersProlonged = statistic.countCustomersProlonged!!,
            countPersonsProlonged = statistic.countPersonsProlonged!!,
            countCustomersUpdated = statistic.countCustomersUpdated!!,

            shopsTotalCount = statistic.shopsTotalCount!!,
            shopsWithFoodCount = statistic.shopsWithFoodCount!!,
            foodTotalAmount = statistic.foodTotalAmount!!,
            foodPerShopAverage = statistic.foodPerShopAverage!!,
            routesLengthKm = statistic.routesLengthKm!!
        )
    }

    private fun formatDate(statistic: DistributionStatisticEntity): String {
        val date = statistic.distribution?.startedAt?.toLocalDate()?.format(DATE_FORMATTER)
        val startTime = statistic.distribution?.startedAt?.format(DATE_TIME_FORMATTER)
        val endTime = statistic.distribution?.endedAt?.format(DATE_TIME_FORMATTER)
        return "$date $startTime - $endTime"
    }

}
