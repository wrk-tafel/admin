package at.wrk.tafel.admin.backend.modules.customer.masterdata

import at.wrk.tafel.admin.backend.common.fop.ClasspathResourceURIResolver
import at.wrk.tafel.admin.backend.database.entities.customer.CustomerEntity
import com.fasterxml.jackson.databind.SerializationFeature
import com.fasterxml.jackson.dataformat.xml.XmlMapper
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule
import io.github.g0dkar.qrcode.QRCode
import org.apache.commons.io.IOUtils
import org.apache.fop.apps.FopFactoryBuilder
import org.apache.fop.apps.MimeConstants
import org.springframework.stereotype.Service
import org.springframework.util.MimeTypeUtils
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.File
import java.math.BigDecimal
import java.math.RoundingMode
import java.text.NumberFormat
import java.time.LocalDate
import java.time.Period
import java.time.format.DateTimeFormatter
import javax.xml.transform.TransformerFactory
import javax.xml.transform.sax.SAXResult
import javax.xml.transform.stream.StreamSource

@Service
class CustomerPdfServiceImpl : CustomerPdfService {
    companion object {
        private val DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")

        private val xmlMapper = XmlMapper().registerModule(JavaTimeModule())
            .configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false)
    }

    override fun generateMasterdataPdf(customer: CustomerEntity): ByteArray {
        val data = createCustomerPdfData(customer)
        val xmlBytes = generateXmlData(data)
        return generatePdf(xmlBytes, "/pdf-templates/masterdata-document.xsl")
    }

    override fun generateIdCardPdf(customer: CustomerEntity): ByteArray {
        val data = createCustomerPdfData(customer)
        val xmlBytes = generateXmlData(data)
        return generatePdf(xmlBytes, "/pdf-templates/idcard-document.xsl")
    }

    override fun generateCombinedPdf(customer: CustomerEntity): ByteArray {
        val data = createCustomerPdfData(customer)
        val xmlBytes = generateXmlData(data)
        return generatePdf(xmlBytes, "/pdf-templates/masterdata-idcard-document.xsl")
    }

    private fun createCustomerPdfData(customer: CustomerEntity): PdfData {
        val user = customer.issuer!!
        val issuer = "${user.personnelNumber} ${user.firstname} ${user.lastname}"

        val countPersons = 1 + customer.additionalPersons.size
        val countInfants =
            customer.additionalPersons.count { Period.between(it.birthDate, LocalDate.now()).years <= 3 }

        val logoBytes =
            IOUtils.toByteArray(CustomerPdfServiceImpl::class.java.getResourceAsStream("/pdf-templates/img/toet-logo.png"))
        return PdfData(
            logoContentType = MimeTypeUtils.IMAGE_PNG_VALUE,
            logoBytes = logoBytes,
            issuer = issuer,
            issuedAtDate = customer.createdAt!!.format(DATE_FORMATTER),
            customer = PdfCustomerData(
                id = customer.customerId!!,
                lastname = customer.lastname!!,
                firstname = customer.firstname!!,
                birthDate = customer.birthDate!!.format(DATE_FORMATTER),
                country = customer.country!!.name!!,
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
                    ?.let { NumberFormat.getCurrencyInstance().format(it.setScale(2, RoundingMode.HALF_EVEN)) }
                    ?: "-",
                incomeDueDate = customer.incomeDue?.format(DATE_FORMATTER) ?: "-",
                validUntilDate = customer.validUntil!!.format(DATE_FORMATTER),
                additionalPersons = customer.additionalPersons.map {
                    PdfAdditionalPersonData(
                        lastname = it.lastname!!,
                        firstname = it.firstname!!,
                        birthDate = it.birthDate!!.format(DATE_FORMATTER),
                        country = it.country!!.name!!,
                        income = it.income
                            ?.takeIf { income -> income.compareTo(BigDecimal.ZERO) != 0 }
                            ?.let { income ->
                                NumberFormat.getCurrencyInstance().format(income.setScale(2, RoundingMode.HALF_EVEN))
                            }
                            ?: "-",
                        incomeDueDate = it.incomeDue?.format(DATE_FORMATTER) ?: "-",
                    )
                },
                idCard = PdfIdCardData(
                    qrCodeContentType = MimeTypeUtils.IMAGE_PNG_VALUE,
                    qrCodeBytes = QRCode(customer.customerId.toString()).render().getBytes()
                )
            ),
            countPersons = countPersons,
            countInfants = countInfants
        )
    }

    private fun generateXmlData(data: PdfData): ByteArray {
        val xmlOutStream = ByteArrayOutputStream()
        xmlOutStream.use {
            xmlMapper.writeValue(it, data)
        }
        return xmlOutStream.toByteArray()
    }

    private fun generatePdf(xmlBytes: ByteArray, stylesheetPath: String): ByteArray {
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
