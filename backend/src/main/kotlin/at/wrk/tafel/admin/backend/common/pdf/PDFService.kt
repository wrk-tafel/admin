package at.wrk.tafel.admin.backend.common.pdf

import at.wrk.tafel.admin.backend.modules.customer.masterdata.CustomerPdfService
import com.fasterxml.jackson.databind.SerializationFeature
import com.fasterxml.jackson.dataformat.xml.XmlMapper
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule
import org.apache.commons.io.IOUtils
import org.apache.fop.apps.FopFactoryBuilder
import org.apache.fop.apps.MimeConstants
import org.springframework.stereotype.Service
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import javax.xml.transform.TransformerFactory
import javax.xml.transform.sax.SAXResult
import javax.xml.transform.stream.StreamSource

@Service
class PDFService {

    companion object {
        private val xmlMapper = XmlMapper().registerModule(JavaTimeModule())
            .configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false)
    }

    fun generatePdf(data: Any, stylesheetPath: String): ByteArray {
        val xmlOutStream = ByteArrayOutputStream()
        xmlOutStream.use {
            xmlMapper.writeValue(it, data)
        }
        val xmlBytes = xmlOutStream.toByteArray()

        // TODO REMOVE
        IOUtils.write(xmlBytes, FileOutputStream(File("D:\\development\\pdf.xml")))
        // TODO REMOVE

        ByteArrayInputStream(xmlBytes).use { xmlStream ->
            val xmlSource = StreamSource(xmlStream)

            val fopBuilder = FopFactoryBuilder(File(".").toURI())
            val fopFactory = fopBuilder.build()
            val foUserAgent = fopFactory.newFOUserAgent()
            val outStream = ByteArrayOutputStream()

            outStream.use { out ->
                val fop = fopFactory.newFop(MimeConstants.MIME_PDF, foUserAgent, out)

                val factory = TransformerFactory.newInstance()
                factory.uriResolver = ClasspathResourceURIResolver()

                val transformer = factory.newTransformer(
                    StreamSource(
                        CustomerPdfService::class.java.getResourceAsStream(stylesheetPath)
                    )
                )

                val res = SAXResult(fop.defaultHandler)
                transformer.transform(xmlSource, res)
            }

            return outStream.toByteArray()
        }
    }

}
