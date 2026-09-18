package at.wrk.tafel.admin.backend.common.pdf

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import ch.qos.logback.classic.Level
import ch.qos.logback.classic.Logger
import ch.qos.logback.classic.spi.ILoggingEvent
import ch.qos.logback.core.read.ListAppender
import com.fasterxml.jackson.annotation.JsonRootName
import com.github.romankh3.image.comparison.ImageComparison
import com.github.romankh3.image.comparison.model.ImageComparisonState
import org.apache.commons.io.FileUtils
import org.apache.pdfbox.Loader
import org.apache.pdfbox.rendering.ImageType
import org.apache.pdfbox.rendering.PDFRenderer
import org.apache.pdfbox.text.PDFTextStripper
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test
import org.slf4j.LoggerFactory
import java.io.File
import java.util.concurrent.CyclicBarrier
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import javax.imageio.ImageIO

internal class PDFServiceTest {

    companion object {
        private val comparisonResultDirectory = File(
            System.getProperty("user.dir"),
            "build/custom-test-results/pdfservice-comparison-results",
        )

        @JvmStatic
        @BeforeAll
        fun beforeAll() {
            comparisonResultDirectory.mkdirs()
        }
    }

    @Test
    fun `sample pdf generated successfully`() {
        val pdfService = PDFService()

        val pdfBytes = pdfService.generatePdf(
            data = DummyData(text = "Test 123"),
            stylesheetPath = "/pdf-references/distribution/sample.xsl",
        )
        FileUtils.writeByteArrayToFile(File(comparisonResultDirectory, "sample-result.pdf"), pdfBytes)

        val document = Loader.loadPDF(pdfBytes)
        val pdfRenderer = PDFRenderer(document)

        assertThat(document.numberOfPages).isEqualTo(1)

        val expectedImage = ImageIO.read(javaClass.getResourceAsStream("/pdf-references/distribution/sample-actual.png"))
        ImageIO.write(expectedImage, "png", File(comparisonResultDirectory, "sample-expected.png"))
        val actualImage = pdfRenderer.renderImageWithDPI(0, 300f, ImageType.RGB)
        ImageIO.write(actualImage, "png", File(comparisonResultDirectory, "sample-actual.png"))

        val comparisonResult = ImageComparison(expectedImage, actualImage).compareImages()
        comparisonResult.writeResultTo(File(comparisonResultDirectory, "sample-diff.png"))

        assertThat(comparisonResult.imageComparisonState).isEqualTo(ImageComparisonState.MATCH)

        document.close()
    }

    @Test
    fun `stylesheet is compiled once and reused`() {
        val stylesheetPath = "/pdf-references/distribution/sample.xsl"

        val firstCompilation = PDFService.compiledStylesheet(stylesheetPath)
        PDFService().generatePdf(data = DummyData(text = "Test 123"), stylesheetPath = stylesheetPath)

        assertThat(PDFService.compiledStylesheet(stylesheetPath)).isSameAs(firstCompilation)
    }

    @Test
    fun `concurrent generation produces one valid pdf per call`() {
        val pdfService = PDFService()
        val threadCount = 8
        val allThreadsReady = CyclicBarrier(threadCount)

        val executor = Executors.newFixedThreadPool(threadCount)
        val results = try {
            (1..threadCount)
                .map { index ->
                    executor.submit<ByteArray> {
                        allThreadsReady.await(60, TimeUnit.SECONDS)
                        pdfService.generatePdf(
                            data = DummyData(text = "Test $index"),
                            stylesheetPath = "/pdf-references/distribution/sample.xsl",
                        )
                    }
                }
                .map { it.get(60, TimeUnit.SECONDS) }
        } finally {
            executor.shutdownNow()
        }

        assertThat(results).hasSize(threadCount)
        results.forEachIndexed { index, pdfBytes ->
            Loader.loadPDF(pdfBytes).use { document ->
                assertThat(document.numberOfPages).isEqualTo(1)
                // Each call has to come back with its own data, not another thread's.
                assertThat(PDFTextStripper().getText(document)).contains("Test ${index + 1}")
            }
        }
    }

    @Test
    fun `generated pdf is logged with template and subject`() {
        val logEvents = captureLogEvents {
            PDFService().generatePdf(
                data = DummyData(text = "Test 123"),
                stylesheetPath = "/pdf-references/distribution/sample.xsl",
                subject = "household 4101",
            )
        }

        assertThat(logEvents).hasSize(1)
        assertThat(logEvents.single().level).isEqualTo(Level.INFO)
        assertThat(logEvents.single().formattedMessage)
            .startsWith("Generated PDF sample.xsl (household 4101) in ")
            .contains(" ms (")
            .endsWith(" bytes)")
    }

    @Test
    fun `generated pdf without subject is logged with template only`() {
        val logEvents = captureLogEvents {
            PDFService().generatePdf(
                data = DummyData(text = "Test 123"),
                stylesheetPath = "/pdf-references/distribution/sample.xsl",
            )
        }

        assertThat(logEvents.single().formattedMessage).startsWith("Generated PDF sample.xsl in ")
    }

    @Test
    fun `fop layout warning is attributed to template and subject`() {
        val logEvents = captureLogEvents {
            PDFService().generatePdf(
                data = DummyData(text = "x".repeat(400)),
                stylesheetPath = "/pdf-references/distribution/sample.xsl",
                subject = "household 4101",
            )
        }

        val warnings = logEvents.filter { it.level == Level.WARN }
        assertThat(warnings).isNotEmpty
        assertThat(warnings).allSatisfy {
            assertThat(it.formattedMessage).startsWith("PDF sample.xsl (household 4101): ")
        }
        assertThat(warnings.first().formattedMessage).contains("exceed the available area")
        // Warnings come before the line that reports the finished document, so they sit under it in the log.
        assertThat(logEvents.last().formattedMessage).startsWith("Generated PDF sample.xsl (household 4101)")
    }

    private fun captureLogEvents(block: () -> Unit): List<ILoggingEvent> {
        val logger = LoggerFactory.getLogger(PDFService::class.java) as Logger
        val appender = ListAppender<ILoggingEvent>().apply { start() }
        logger.addAppender(appender)
        try {
            block()
        } finally {
            logger.detachAppender(appender)
        }
        return appender.list.toList()
    }

    @Test
    fun `unknown stylesheet fails with a readable message`() {
        assertThatThrownBy {
            PDFService().generatePdf(
                data = DummyData(text = "Test 123"),
                stylesheetPath = "/pdf-references/missing.xsl",
            )
        }
            .isInstanceOf(IllegalStateException::class.java)
            .hasMessage("PDF stylesheet not found: /pdf-references/missing.xsl")
    }
}

@JsonRootName("data")
@ExcludeFromTestCoverage
data class DummyData(
    val text: String,
)
