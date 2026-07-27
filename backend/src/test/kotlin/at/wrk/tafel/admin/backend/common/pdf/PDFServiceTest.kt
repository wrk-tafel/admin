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
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test
import java.io.File
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
}

@JsonRootName("data")
@ExcludeFromTestCoverage
data class DummyData(
    val text: String,
)
