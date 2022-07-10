package at.wrk.tafel.admin.backend.modules.customer.masterdata

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.entities.CustomerEntity
import com.fasterxml.jackson.databind.SerializationFeature
import com.fasterxml.jackson.dataformat.xml.XmlMapper
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule
import org.apache.commons.io.IOUtils
import org.apache.fop.apps.FopFactory
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
class MasterdataPdfServiceImpl : MasterdataPdfService {
    companion object {
        private val DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")

        private val xmlMapper = XmlMapper().registerModule(JavaTimeModule())
            .configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false)
    }

    override fun generatePdf(customer: CustomerEntity): ByteArray {
        val data = createPdfData(customer)
        val xmlBytes = generateXmlData(data)
        return generatePdf(xmlBytes, "/masterdata-template/masterdata.xsl")
    }

    fun createPdfData(customer: CustomerEntity): MasterdataPdfData {
        val countPersons = 1 + customer.additionalPersons.size
        val countInfants =
            customer.additionalPersons.count { Period.between(it.birthDate, LocalDate.now()).years <= 3 }

        val logoBytes =
            IOUtils.toByteArray(MasterdataPdfServiceImpl::class.java.getResourceAsStream("/masterdata-template/img/toet_logo.png"))
        return MasterdataPdfData(
            logoContentType = MimeTypeUtils.IMAGE_PNG_VALUE,
            logoBytes = logoBytes,
            currentDate = LocalDate.now().format(DATE_FORMATTER),
            customer = MasterdataPdfCustomer(
                id = customer.customerId!!,
                lastname = customer.lastname!!,
                firstname = customer.firstname!!,
                birthDate = customer.birthDate!!.format(DATE_FORMATTER),
                telephoneNumber = customer.telephoneNumber,
                email = customer.email,
                address = MasterdataPdfAddressData(
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
                    ?.let { "$it €" }
                    ?: "-",
                incomeDueDate = customer.incomeDue?.format(DATE_FORMATTER) ?: "unbefristet",
                additionalPersons = customer.additionalPersons.map {
                    MasterdataPdfAdditionalPersonData(
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
