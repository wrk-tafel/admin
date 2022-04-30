package at.wrk.tafel.admin.backend.modules.customer.masterdata

import com.fasterxml.jackson.dataformat.xml.XmlMapper
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule
import org.apache.commons.io.FileUtils
import org.apache.commons.io.IOUtils
import org.apache.fop.apps.FopFactory
import org.apache.fop.apps.MimeConstants
import org.springframework.stereotype.Service
import org.springframework.util.MimeTypeUtils
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.File
import java.time.LocalDate
import java.time.LocalDateTime
import javax.xml.transform.TransformerFactory
import javax.xml.transform.sax.SAXResult
import javax.xml.transform.stream.StreamSource

@Service
class MasterdataPdfServiceImpl : MasterdataPdfService {
    companion object {
        private val xmlMapper = XmlMapper().registerModule(JavaTimeModule())
    }

    override fun generatePdf(customer: MasterdataPdfCustomer): ByteArray {
        val data = createPdfData(customer)
        val xmlBytes = generateXmlData(data)
        val pdfBytes = generatePdf(xmlBytes, "/masterdata-template/masterdata.xsl")

        // TODO DEBUG REMOVE
        FileUtils.writeByteArrayToFile(File("D:\\test.xml"), xmlBytes)
        FileUtils.writeByteArrayToFile(File("D:\\test.pdf"), pdfBytes)
        // TODO DEBUG REMOVE

        return pdfBytes
    }

    fun createPdfData(customer: MasterdataPdfCustomer): MasterdataPdfData {
        val logoBytes =
            IOUtils.toByteArray(MasterdataPdfServiceImpl::class.java.getResourceAsStream("/masterdata-template/img/toet_logo.png"))
        return MasterdataPdfData(
            logoContentType = MimeTypeUtils.IMAGE_PNG_VALUE,
            logoBytes = logoBytes,
            customer = customer
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
                        MasterdataPdfServiceImpl::class.java.getResourceAsStream(stylesheetPath)
                    )
                )

                val res = SAXResult(fop.defaultHandler)
                transformer.transform(xmlSource, res)
            }

            return outStream.toByteArray()
        }
    }
}

// TODO DEBUG REMOVE
fun main() {
    MasterdataPdfServiceImpl().generatePdf(
        MasterdataPdfCustomer(
            id = 1000,
            lastname = "Mustermann",
            firstname = "Max",
            birthDate = LocalDate.now(),
            telephoneNumber = 664123123132,
            email = "test@test.com",
            address = MasterdataPdfAddressData(
                street = "Teststraße",
                houseNumber = "10",
                door = "1",
                stairway = "2",
                postalCode = 1010,
                city = "Wien"
            ),
            employer = "Test employer",
            additionalPersons = listOf(
                MasterdataPdfAdditionalPersonData(
                    lastname = "Add",
                    firstname = "Pers 1",
                    birthDate = LocalDateTime.now()
                ),
                MasterdataPdfAdditionalPersonData(
                    lastname = "Add",
                    firstname = "Pers 2",
                    birthDate = LocalDateTime.now()
                ),
                MasterdataPdfAdditionalPersonData(
                    lastname = "Add",
                    firstname = "Pers 3",
                    birthDate = LocalDateTime.now()
                ),
                MasterdataPdfAdditionalPersonData(
                    lastname = "Add",
                    firstname = "Pers 4",
                    birthDate = LocalDateTime.now()
                ),
                MasterdataPdfAdditionalPersonData(
                    lastname = "Add",
                    firstname = "Pers 5",
                    birthDate = LocalDateTime.now()
                )
            )
        )
    )
}
// TODO DEBUG REMOVE
