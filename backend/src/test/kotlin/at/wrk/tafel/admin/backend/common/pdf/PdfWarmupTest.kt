package at.wrk.tafel.admin.backend.common.pdf

import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.apache.fop.events.EventListener
import org.apache.fop.events.model.EventSeverity
import org.apache.pdfbox.Loader
import org.apache.pdfbox.text.PDFTextStripper
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatCode
import org.junit.jupiter.api.Test
import org.springframework.boot.DefaultApplicationArguments

internal class PdfWarmupTest {

    @Test
    fun `every document stylesheet is precompiled and includes are not compiled on their own`() {
        val stylesheets = PDFService().precompileStylesheets()

        assertThat(stylesheets).contains(
            "/pdf-templates/customer-pdf/masterdata-document.xsl",
            "/pdf-templates/customer-pdf/idcard-document.xsl",
            "/pdf-templates/customer-pdf/masterdata-idcard-document.xsl",
            "/pdf-templates/daily-report/dailyreport-document.xsl",
            PdfWarmup.WARMUP_STYLESHEET_PATH,
        )
        assertThat(stylesheets).noneMatch { it.contains("/includes/") }
        stylesheets.forEach { assertThat(PDFService.compiledStylesheet(it)).isNotNull }
    }

    @Test
    fun `warm-up document renders without a fop warning`() {
        val pdfService = PDFService()
        val warnings = mutableListOf<String>()
        val listener = EventListener { event ->
            if (event.severity != EventSeverity.INFO) warnings.add(event.eventID)
        }

        val pdfBytes = pdfService.generatePdf(
            PdfWarmup(pdfService).warmupData(),
            PdfWarmup.WARMUP_STYLESHEET_PATH,
            eventListener = listener,
        )

        assertThat(warnings).isEmpty()
        Loader.loadPDF(pdfBytes).use { document ->
            assertThat(document.numberOfPages).isEqualTo(1)
            assertThat(PDFTextStripper().getText(document)).contains("Tafel", "ÄÖÜ äöü ß")
        }
    }

    @Test
    fun `run precompiles the stylesheets and renders the warm-up document`() {
        val pdfService = mockk<PDFService>()
        every { pdfService.precompileStylesheets() } returns listOf(PdfWarmup.WARMUP_STYLESHEET_PATH)
        every { pdfService.generatePdf(any(), any(), any(), any()) } returns ByteArray(0)

        PdfWarmup(pdfService).run(DefaultApplicationArguments())

        verify(exactly = 1) { pdfService.precompileStylesheets() }
        verify(exactly = 1) { pdfService.generatePdf(any<WarmupPdfData>(), PdfWarmup.WARMUP_STYLESHEET_PATH, "warm-up", null) }
    }

    @Test
    fun `failed warm-up does not stop the startup`() {
        val pdfService = mockk<PDFService>()
        every { pdfService.precompileStylesheets() } throws IllegalStateException("broken stylesheet")

        assertThatCode { PdfWarmup(pdfService).run(DefaultApplicationArguments()) }.doesNotThrowAnyException()
    }
}
