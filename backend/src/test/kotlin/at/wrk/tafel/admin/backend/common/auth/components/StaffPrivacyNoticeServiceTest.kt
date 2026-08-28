package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.pdf.PDFService
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import org.apache.pdfbox.Loader
import org.apache.pdfbox.text.PDFTextStripper
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.time.Clock
import java.time.Instant
import java.time.Period
import java.time.ZoneId

class StaffPrivacyNoticeServiceTest {

    // Real, unmocked - proves the XSL-FO stylesheet actually renders through Apache FOP rather than
    // only checking that some byte array was returned.
    private val pdfService = PDFService()
    private val clock: Clock = Clock.fixed(Instant.parse("2026-08-28T10:00:00Z"), ZoneId.of("UTC"))

    private val tafelAdminProperties = TafelAdminProperties().apply {
        userDeletion.retentionTime = Period.ofYears(7)
        employeeDeletion.retentionTime = Period.ofYears(7)
        audit.retentionDays = 30
    }

    private val service = StaffPrivacyNoticeService(pdfService, tafelAdminProperties, clock)

    @Test
    fun `generate privacy notice pdf`() {
        val pdfBytes = service.generatePrivacyNoticePdf()

        assertThat(String(pdfBytes.copyOfRange(0, 5), Charsets.US_ASCII)).isEqualTo("%PDF-")

        // Eight sections of legal text don't fit on a single A4 page the way the shorter customer
        // notice does - FOP paginates on its own, and PDFTextStripper reads across every page.
        val document = Loader.loadPDF(pdfBytes)
        assertThat(document.numberOfPages).isGreaterThanOrEqualTo(1)

        val text = PDFTextStripper().getText(document)
        assertThat(text).contains("28.08.2026")
        assertThat(text).contains("7 Jahren")
        assertThat(text).contains("30 Tagen")

        // The footer's page number/generation-date stamp (issue #3429 follow-up) - fo:static-content
        // repeats it on every page, so this checks each page individually rather than just somewhere
        // in the whole extracted text.
        val pageCount = document.numberOfPages
        for (page in 1..pageCount) {
            val stripper = PDFTextStripper().apply {
                startPage = page
                endPage = page
            }
            assertThat(stripper.getText(document)).contains("Erstellt am 28.08.2026 · Seite $page von $pageCount")
        }
        document.close()
    }

    @Test
    fun `generate privacy notice pdf - renders a mixed years-and-months retention period`() {
        tafelAdminProperties.userDeletion.retentionTime = Period.of(1, 6, 0)

        val document = Loader.loadPDF(service.generatePrivacyNoticePdf())
        val text = PDFTextStripper().getText(document)

        assertThat(text).contains("1 Jahren 6 Monaten")
        document.close()
    }
}
