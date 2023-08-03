package at.wrk.tafel.admin.backend.modules.reporting

import at.wrk.tafel.admin.backend.common.pdf.PDFService
import org.springframework.stereotype.Service

@Service
class DailyReportService(
    private val pdfService: PDFService
) {

    fun generateDailyReportPdf(): ByteArray {
        val pdfModel = createPdfModel()
        return pdfService.generatePdf(pdfModel, "/pdf-templates/daily-report/dailyreport-document.xsl")
    }

    private fun createPdfModel(): DailyReportPdfModel {
        return DailyReportPdfModel(
            test = "asdf"
        )
    }

}

data class DailyReportPdfModel(
    val test: String
)
