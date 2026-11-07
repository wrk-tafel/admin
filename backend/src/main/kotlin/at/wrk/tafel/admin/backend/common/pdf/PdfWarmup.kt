package at.wrk.tafel.admin.backend.common.pdf

import com.fasterxml.jackson.annotation.JsonRootName
import org.slf4j.LoggerFactory
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.stereotype.Component
import org.springframework.util.MimeTypeUtils

/**
 * Pays the first-PDF cost at startup instead of in the first user's request (issue #3945): building
 * [PDFService]'s FOP factory (extracting and registering the bundled fonts), compiling every
 * stylesheet, and the class loading and JIT compilation of FOP's layout and image code that a first
 * rendering triggers. Without it, the first household PDF after a start took about 3 s against about
 * 250 ms for the ones after it.
 *
 * Runs as an [ApplicationRunner], so it adds those seconds to the startup instead. A failure here is
 * logged and otherwise ignored - every document is still rendered on demand as before, and an
 * application that cannot render a PDF should still serve everything else.
 */
@Component
class PdfWarmup(
    private val pdfService: PDFService,
) : ApplicationRunner {

    companion object {
        private val log = LoggerFactory.getLogger(PdfWarmup::class.java)

        internal const val WARMUP_STYLESHEET_PATH = "/pdf-templates/warmup/warmup-document.xsl"
        private const val LOGO_RESOURCE_PATH = "/assets/logo.png"
    }

    override fun run(args: ApplicationArguments) {
        val startedAt = System.nanoTime()
        try {
            val stylesheets = pdfService.precompileStylesheets()
            pdfService.generatePdf(warmupData(), WARMUP_STYLESHEET_PATH, "warm-up")
            log.info(
                "PDF rendering warmed up in {} ms ({} stylesheets compiled)",
                (System.nanoTime() - startedAt) / 1_000_000,
                stylesheets.size,
            )
        } catch (e: Exception) {
            log.warn("PDF warm-up failed, the first PDF will be rendered cold", e)
        }
    }

    internal fun warmupData() = WarmupPdfData(
        title = "Tafel",
        text = "ÄÖÜ äöü ß 0123456789",
        logoContentType = MimeTypeUtils.IMAGE_PNG_VALUE,
        logoBytes = checkNotNull(javaClass.getResourceAsStream(LOGO_RESOURCE_PATH)) {
            "Logo not found: $LOGO_RESOURCE_PATH"
        }.use { it.readBytes() },
    )
}

@JsonRootName("data")
class WarmupPdfData(
    val title: String,
    val text: String,
    val logoContentType: String,
    val logoBytes: ByteArray,
)
