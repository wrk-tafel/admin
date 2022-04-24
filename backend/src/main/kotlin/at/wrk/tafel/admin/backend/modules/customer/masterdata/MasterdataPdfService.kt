package at.wrk.tafel.admin.backend.modules.customer.masterdata

import com.fasterxml.jackson.dataformat.xml.XmlMapper
import com.fasterxml.jackson.dataformat.xml.annotation.JacksonXmlRootElement
import org.apache.commons.io.FileUtils
import org.apache.commons.io.IOUtils
import org.apache.fop.apps.FopFactory
import org.apache.fop.apps.MimeConstants
import org.springframework.stereotype.Service
import org.springframework.util.MimeType
import org.springframework.util.MimeTypeUtils
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.File
import javax.xml.transform.TransformerFactory
import javax.xml.transform.sax.SAXResult
import javax.xml.transform.stream.StreamSource

@Service
class MasterdataPdfService {
    companion object {
        private val xmlMapper = XmlMapper()
    }

    fun generatePdf(): ByteArray {
        val data = loadPdfData()
        val xmlBytes = generateXmlData(data)
        val pdfBytes = generatePdf(xmlBytes, "/templates/masterdata.xsl")

        // TODO DEBUG REMOVE
        FileUtils.writeByteArrayToFile(File("D:\\test.xml"), xmlBytes)
        FileUtils.writeByteArrayToFile(File("D:\\test.pdf"), pdfBytes)
        // TODO DEBUG REMOVE

        return pdfBytes
    }

    fun loadPdfData(): MasterdataPdfData {
        val logoBytes =
            IOUtils.toByteArray(MasterdataPdfService::class.java.getResourceAsStream("/templates/img/toet_logo.png"))
        return MasterdataPdfData(
            logoContentType = MimeTypeUtils.IMAGE_PNG_VALUE,
            logoBytes = logoBytes
        )
    }

    fun generateXmlData(data: MasterdataPdfData): ByteArray {
        val xmlOutStream = ByteArrayOutputStream()
        xmlOutStream.use {
            xmlMapper.writeValue(it, data)
        }
        return xmlOutStream.toByteArray()
    }

    private fun generatePdf(xmlBytes: ByteArray, stylesheetPath: String): ByteArray {
        ByteArrayInputStream(xmlBytes).use { xmlStream ->
            val xmlSource = StreamSource(xmlStream)
            val fopFactory = FopFactory.newInstance(File(".").toURI())
            val foUserAgent = fopFactory.newFOUserAgent()
            val outStream = ByteArrayOutputStream()

            outStream.use { out ->
                val fop = fopFactory.newFop(MimeConstants.MIME_PDF, foUserAgent, out)

                val factory = TransformerFactory.newInstance()
                val transformer = factory.newTransformer(
                    StreamSource(
                        MasterdataPdfService::class.java.getResourceAsStream(stylesheetPath)
                    )
                )

                val res = SAXResult(fop.defaultHandler)
                transformer.transform(xmlSource, res)
            }

            return outStream.toByteArray()
        }
    }

}

@JacksonXmlRootElement(localName = "data")
data class MasterdataPdfData(
    val logoContentType: String,
    val logoBytes: ByteArray
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as MasterdataPdfData

        if (!logoBytes.contentEquals(other.logoBytes)) return false

        return true
    }

    override fun hashCode(): Int {
        return logoBytes.contentHashCode()
    }
}

// TODO DEBUG REMOVE
fun main() {
    MasterdataPdfService().generatePdf()
}
// TODO DEBUG REMOVE
