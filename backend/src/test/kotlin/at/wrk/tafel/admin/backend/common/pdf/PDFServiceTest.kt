package at.wrk.tafel.admin.backend.common.pdf

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import com.fasterxml.jackson.annotation.JsonRootName
import com.github.romankh3.image.comparison.ImageComparison
import com.github.romankh3.image.comparison.model.ImageComparisonState
import org.apache.commons.io.FileUtils
import org.apache.pdfbox.Loader
import org.apache.pdfbox.rendering.ImageType
import org.apache.pdfbox.rendering.PDFRenderer
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test
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
        results.forEach { pdfBytes ->
            Loader.loadPDF(pdfBytes).use { document ->
                assertThat(document.numberOfPages).isEqualTo(1)
            }
        }
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
