package at.wrk.tafel.admin.backend.common.pdf

import org.apache.commons.io.IOUtils
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.io.File
import java.io.FileOutputStream

internal class PDFServiceTest {

    @Test
    fun `sample pdf generated successfully`() {
        val pdfService = PDFService()

        val resultBytes =
            pdfService.generatePdf(DummyData(text = "Test 123"), "/pdf-references/distribution/sample.xsl")

        // TODO REMOVE
        IOUtils.write(resultBytes, FileOutputStream(File("D:\\development\\sample.pdf")))
        // TODO REMOVE

        val expectedBytes = ByteArray(0)
        IOUtils.readFully(
            ClassLoader.getSystemClassLoader().getResourceAsStream("/pdf-references/distribution/sample.pdf"),
            expectedBytes
        )
        assertThat(resultBytes).isEqualTo(expectedBytes)
    }

}

data class DummyData(
    val text: String
)
