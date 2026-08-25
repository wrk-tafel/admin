package at.wrk.tafel.admin.backend.modules.household.internal.masterdata

import at.wrk.tafel.admin.backend.common.pdf.PDFService
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.person.PersonEntity
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

@Service
class HouseholdPdfService(
    private val pdfService: PDFService,
) {
    companion object {
        private val DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
    }

    fun generateMasterdataPdf(household: HouseholdEntity): ByteArray {
        val data = createHouseholdPdfData(household)
        return pdfService.generatePdf(data, "/pdf-templates/customer-pdf/masterdata-document.xsl")
    }

    fun generateIdCardPdf(household: HouseholdEntity): ByteArray {
        val data = createHouseholdPdfData(household)
        return pdfService.generatePdf(data, "/pdf-templates/customer-pdf/idcard-document.xsl")
    }

    /**
     * A printable sheet an operator hands the customer at intake to read and sign, filed outside the
     * application - there is no stored consent field, this document is the whole record (GDPR G2,
     * issue #3177). Unlike [createHouseholdPdfData], it carries only what the notice text needs - no
     * income/employer/additional-persons data.
     */
    fun generatePrivacyNoticePdf(household: HouseholdEntity): ByteArray {
        val mainPerson = household.mainPerson ?: household.persons.firstOrNull { it.isMainPerson }
        val logoBytes = IOUtils.toByteArray(javaClass.getResourceAsStream("/assets/logo.png"))

        val data = PrivacyNoticePdfData(
            logoContentType = MimeTypeUtils.IMAGE_PNG_VALUE,
            logoBytes = logoBytes,
            householdId = household.householdId,
            fullName = listOfNotNull(mainPerson?.firstname, mainPerson?.lastname).joinToString(" ").ifBlank { "-" },
            issuedAtDate = LocalDate.now().format(DATE_FORMATTER),
        )
        return pdfService.generatePdf(data, "/pdf-templates/customer-pdf/privacy-notice-document.xsl")
    }

    private fun createHouseholdPdfData(household: HouseholdEntity): PdfData {
        val issuer = household.issuer?.let { "${it.personnelNumber} ${it.firstname} ${it.lastname}" }

        val mainPerson = household.mainPerson ?: household.persons.firstOrNull { it.isMainPerson }
        val additionalPersons = household.additionalPersons()

        val countPersons = 1 + additionalPersons.count { !it.excludeFromHousehold }
        val countInfants =
            additionalPersons
                .filter { it.birthDate != null }
                .count { Period.between(it.birthDate, LocalDate.now()).years <= 3 }

        val logoBytes =
            IOUtils.toByteArray(javaClass.getResourceAsStream("/assets/logo.png"))
        return PdfData(
            logoContentType = MimeTypeUtils.IMAGE_PNG_VALUE,
            logoBytes = logoBytes,
            issuer = issuer,
            issuedAtDate = household.createdAt!!.format(DATE_FORMATTER),
            customer = PdfCustomerData(
                id = household.householdId,
                lastname = mainPerson?.lastname ?: "-",
                firstname = mainPerson?.firstname ?: "-",
                birthDate = mainPerson?.birthDate?.format(DATE_FORMATTER) ?: "-",
                gender = mainPerson?.gender?.title ?: "-",
                country = mainPerson!!.country.name,
                telephoneNumber = household.telephoneNumber ?: "-",
                email = household.email ?: "-",
                address = PdfAddressData(
                    street = household.addressStreet ?: "-",
                    houseNumber = household.addressHouseNumber ?: "-",
                    door = household.addressDoor ?: "-",
                    stairway = household.addressStairway ?: "-",
                    postalCode = household.addressPostalCode,
                    city = household.addressCity ?: "-",
                ),
                employer = mainPerson.employer ?: "-",
                income = formatIncome(mainPerson.income),
                incomeDueDate = mainPerson.incomeDue?.format(DATE_FORMATTER) ?: "-",
                validUntilDate = household.validUntil.format(DATE_FORMATTER),
                additionalPersons = additionalPersons.map { mapAdditionalPerson(it) },
                idCard = PdfIdCardData(
                    qrCodeContentType = MimeTypeUtils.IMAGE_PNG_VALUE,
                    qrCodeBytes = generateQRCode(household.householdId.toString()),
                ),
            ),
            countPersons = countPersons,
            countInfants = countInfants,
        )
    }

    private fun mapAdditionalPerson(person: PersonEntity) = PdfAdditionalPersonData(
        lastname = person.lastname!!,
        firstname = person.firstname!!,
        birthDate = person.birthDate?.format(DATE_FORMATTER) ?: "-",
        gender = person.gender?.title ?: "-",
        country = person.country.name,
        employer = person.employer ?: "-",
        income = formatIncome(person.income),
        incomeDueDate = person.incomeDue?.format(DATE_FORMATTER) ?: "-",
        excludeFromHousehold = person.excludeFromHousehold,
    )

    private fun formatIncome(income: BigDecimal?): String = income
        ?.takeIf { it.compareTo(BigDecimal.ZERO) != 0 }
        ?.let {
            NumberFormat.getCurrencyInstance().format(it.setScale(2, RoundingMode.HALF_EVEN))
        }
        ?: "-"

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
