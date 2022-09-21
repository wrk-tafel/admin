package at.wrk.tafel.admin.backend.modules.customer.masterdata

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.entities.CustomerEntity
import at.wrk.tafel.admin.backend.modules.customer.masterdata.fop.ClasspathResolverURIAdapter
import com.fasterxml.jackson.databind.SerializationFeature
import com.fasterxml.jackson.dataformat.xml.XmlMapper
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule
import org.apache.commons.io.IOUtils
import org.apache.fop.apps.FopFactoryBuilder
import org.apache.fop.apps.MimeConstants
import org.springframework.stereotype.Service
import org.springframework.util.MimeTypeUtils
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.File
import java.math.BigDecimal
import java.time.LocalDate
import java.time.Period
import java.time.format.DateTimeFormatter
import javax.xml.transform.TransformerFactory
import javax.xml.transform.sax.SAXResult
import javax.xml.transform.stream.StreamSource


@Service
// TODO add tests
@ExcludeFromTestCoverage
class CustomerPdfServiceImpl : CustomerPdfService {
    companion object {
        private val DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")

        private val xmlMapper = XmlMapper().registerModule(JavaTimeModule())
            .configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false)
    }

    override fun generateMasterdataPdf(customer: CustomerEntity): ByteArray {
        val data = createCustomerPdfData(customer)
        val xmlBytes = generateXmlData(data)
        return generatePdf(xmlBytes, "/pdf-templates/masterdata_document.xsl")
    }

    override fun generateIdCardPdf(customer: CustomerEntity): ByteArray {
        val data = createCustomerPdfData(customer)
        val xmlBytes = generateXmlData(data)
        return generatePdf(xmlBytes, "/pdf-templates/idcard_document.xsl")
    }

    override fun generateMasterdataIdCardPdf(customer: CustomerEntity): ByteArray {
        val data = createCustomerPdfData(customer)
        val xmlBytes = generateXmlData(data)
        return generatePdf(xmlBytes, "/pdf-templates/masterdata_idcard_document.xsl")
    }

    fun createCustomerPdfData(customer: CustomerEntity): CustomerPdfData {
        val countPersons = 1 + customer.additionalPersons.size
        val countInfants =
            customer.additionalPersons.count { Period.between(it.birthDate, LocalDate.now()).years <= 3 }

        val logoBytes =
            IOUtils.toByteArray(CustomerPdfServiceImpl::class.java.getResourceAsStream("/pdf-templates/img/toet_logo.png"))
        return CustomerPdfData(
            logoContentType = MimeTypeUtils.IMAGE_PNG_VALUE,
            logoBytes = logoBytes,
            currentDate = LocalDate.now().format(DATE_FORMATTER),
            customer = PdfCustomerData(
                id = customer.customerId!!,
                lastname = customer.lastname!!,
                firstname = customer.firstname!!,
                birthDate = customer.birthDate!!.format(DATE_FORMATTER),
                telephoneNumber = customer.telephoneNumber,
                email = customer.email,
                address = PdfAddressData(
                    street = customer.addressStreet!!,
                    houseNumber = customer.addressHouseNumber!!,
                    door = customer.addressDoor,
                    stairway = customer.addressStairway,
                    postalCode = customer.addressPostalCode!!,
                    city = customer.addressCity!!
                ),
                employer = customer.employer!!,
                income = customer.income
                    ?.takeIf { it.compareTo(BigDecimal.ZERO) != 0 }
                    ?.let { "${it.setScale(0)} €" }
                    ?: "-",
                incomeDueDate = customer.incomeDue?.format(DATE_FORMATTER) ?: "unbefristet",
                additionalPersons = customer.additionalPersons.map {
                    PdfAdditionalPersonData(
                        lastname = it.lastname!!,
                        firstname = it.firstname!!,
                        birthDate = it.birthDate!!.format(DATE_FORMATTER),
                        income = it.income
                            ?.takeIf { income -> income.compareTo(BigDecimal.ZERO) != 0 }
                            ?.let { income -> "$income €" }
                            ?: "-"
                    )
                }
            ),
            countPersons = countPersons,
            countInfants = countInfants
        )
    }

    fun generateXmlData(data: CustomerPdfData): ByteArray {
        val xmlOutStream = ByteArrayOutputStream()
        xmlOutStream.use {
            xmlMapper.writeValue(it, data)
        }
        return xmlOutStream.toByteArray()
    }

    private fun generatePdf(xmlBytes: ByteArray, stylesheetPath: String): ByteArray {
        ByteArrayInputStream(xmlBytes).use { xmlStream ->
            val xmlSource = StreamSource(xmlStream)

            val fopBuilder = FopFactoryBuilder(File(".").toURI(), ClasspathResolverURIAdapter())
            val fopFactory = fopBuilder.build()
            val foUserAgent = fopFactory.newFOUserAgent()
            val outStream = ByteArrayOutputStream()

            outStream.use { out ->
                val fop = fopFactory.newFop(MimeConstants.MIME_PDF, foUserAgent, out)

                val factory = TransformerFactory.newInstance()
                val transformer = factory.newTransformer(
                    StreamSource(
                        CustomerPdfServiceImpl::class.java.getResourceAsStream(stylesheetPath)
                    )
                )

                val res = SAXResult(fop.defaultHandler)
                transformer.transform(xmlSource, res)
            }

            return outStream.toByteArray()
        }
    }
}
