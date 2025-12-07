package at.wrk.tafel.admin.backend.common.pdf

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import com.fasterxml.jackson.annotation.JsonRootName
import org.apache.commons.io.IOUtils
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Disabled
import org.junit.jupiter.api.Test

internal class PDFServiceTest {

    @Test
    @Disabled
    // TODO fix test
    fun `sample pdf generated successfully`() {
        val pdfService = PDFService()

        val resultBytes = pdfService.generatePdf(
            data = DummyData(text = "Test 123"),
            stylesheetPath = "/pdf-references/distribution/sample.xsl"
        )

        // TODO REMOVE
        // IOUtils.write(resultBytes, FileOutputStream(File("D:\\development\\sample.pdf")))
        // TODO REMOVE

        val expectedBytes = ByteArray(0)
        IOUtils.readFully(
            javaClass.getResourceAsStream("/pdf-references/distribution/sample.pdf"),
            expectedBytes
        )
        assertThat(resultBytes).isEqualTo(expectedBytes)
    }

}

@JsonRootName("data")
@ExcludeFromTestCoverage
data class DummyData(
    val text: String
)
