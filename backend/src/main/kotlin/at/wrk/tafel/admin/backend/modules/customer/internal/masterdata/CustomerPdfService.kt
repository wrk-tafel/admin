package at.wrk.tafel.admin.backend.modules.customer.internal.masterdata

import at.wrk.tafel.admin.backend.common.pdf.PDFService
import at.wrk.tafel.admin.backend.database.model.customer.CustomerEntity
import org.apache.commons.io.IOUtils
import org.springframework.stereotype.Service
import org.springframework.util.MimeTypeUtils
import qrcode.QRCode
import qrcode.raw.ErrorCorrectionLevel
import java.math.BigDecimal
import java.math.RoundingMode
import java.text.NumberFormat
import java.time.LocalDate
import java.time.Period
import java.time.format.DateTimeFormatter
import java.util.*

@Service
class CustomerPdfService(
    private val pdfService: PDFService,
) {
    companion object {
        private val DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
    }

    fun generateMasterdataPdf(customer: CustomerEntity): ByteArray {
        val data = createCustomerPdfData(customer)
        return pdfService.generatePdf(data, "/pdf-templates/customer-pdf/masterdata-document.xsl")
    }

    fun generateIdCardPdf(customer: CustomerEntity): ByteArray {
        val data = createCustomerPdfData(customer)
        return pdfService.generatePdf(data, "/pdf-templates/customer-pdf/idcard-document.xsl")
    }

    fun generateCombinedPdf(customer: CustomerEntity): ByteArray {
        val data = createCustomerPdfData(customer)
        return pdfService.generatePdf(data, "/pdf-templates/customer-pdf/masterdata-idcard-document.xsl")
    }

    private fun createCustomerPdfData(customer: CustomerEntity): PdfData {
        val issuer = customer.issuer?.let { "${it.personnelNumber} ${it.firstname} ${it.lastname}" }

        val countPersons = 1 + customer.additionalPersons.count { !it.excludeFromHousehold!! }
        val countInfants =
            customer.additionalPersons
                .filter { it.birthDate != null }
                .count { Period.between(it.birthDate, LocalDate.now()).years <= 3 }

        val logoBytes =
            IOUtils.toByteArray(javaClass.getResourceAsStream("/assets/logo.png"))
        return PdfData(
            logoContentType = MimeTypeUtils.IMAGE_PNG_VALUE,
            logoBytes = logoBytes,
            issuer = issuer,
            issuedAtDate = customer.createdAt!!.format(DATE_FORMATTER),
            customer = PdfCustomerData(
                id = customer.customerId!!,
                lastname = customer.lastname ?: "-",
                firstname = customer.firstname ?: "-",
                birthDate = customer.birthDate?.format(DATE_FORMATTER) ?: "-",
                gender = customer.gender?.title ?: "-",
                country = customer.country!!.name!!,
                telephoneNumber = customer.telephoneNumber ?: "-",
                email = customer.email ?: "-",
                address = PdfAddressData(
                    street = customer.addressStreet ?: "-",
                    houseNumber = customer.addressHouseNumber ?: "-",
                    door = customer.addressDoor ?: "-",
                    stairway = customer.addressStairway ?: "-",
                    postalCode = customer.addressPostalCode,
                    city = customer.addressCity ?: "-"
                ),
                employer = customer.employer ?: "-",
                income = customer.income
                    ?.takeIf { it.compareTo(BigDecimal.ZERO) != 0 }
                    ?.let {
                        NumberFormat.getCurrencyInstance(Locale.GERMANY).format(it.setScale(2, RoundingMode.HALF_EVEN))
                    }
                    ?: "-",
                incomeDueDate = customer.incomeDue?.format(DATE_FORMATTER) ?: "-",
                additionalPersons = customer.additionalPersons.map {
                    PdfAdditionalPersonData(
                        lastname = it.lastname!!,
                        firstname = it.firstname!!,
                        birthDate = it.birthDate?.format(DATE_FORMATTER) ?: "-",
                        gender = it.gender?.title ?: "-",
                        country = it.country!!.name!!,
                        employer = it.employer ?: "-",
                        income = it.income
                            ?.takeIf { income -> income.compareTo(BigDecimal.ZERO) != 0 }
                            ?.let { income ->
                                NumberFormat.getCurrencyInstance(Locale.GERMANY)
                                    .format(income.setScale(2, RoundingMode.HALF_EVEN))
                            }
                            ?: "-",
                        incomeDueDate = it.incomeDue?.format(DATE_FORMATTER) ?: "-",
                    )
                },
                idCard = PdfIdCardData(
                    qrCodeContentType = MimeTypeUtils.IMAGE_PNG_VALUE,
                    qrCodeBytes = generateQRCode(customer.customerId.toString())
                )
            ),
            countPersons = countPersons,
            countInfants = countInfants
        )
    }

    private fun generateQRCode(data: String): ByteArray {
        val logoBytes =
            IOUtils.toByteArray(javaClass.getResourceAsStream("/assets/logo.png"))

        val qrCode = QRCode.ofSquares()
            .withErrorCorrectionLevel(ErrorCorrectionLevel.MEDIUM)
            .withInformationDensity(6)
            .withLogo(logoBytes, 250, 119)
            .build(data)
        return qrCode.renderToBytes()
    }

}
