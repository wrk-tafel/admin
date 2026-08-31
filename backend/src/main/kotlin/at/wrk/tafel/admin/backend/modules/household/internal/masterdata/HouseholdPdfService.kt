package at.wrk.tafel.admin.backend.modules.household.internal.masterdata

import at.wrk.tafel.admin.backend.common.pdf.PDFService
import at.wrk.tafel.admin.backend.common.retention.RetentionPeriodFormatter
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
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
import java.time.Clock
import java.time.LocalDate
import java.time.Period
import java.time.format.DateTimeFormatter

@Service
class HouseholdPdfService(
    private val pdfService: PDFService,
    private val clock: Clock,
    private val tafelAdminProperties: TafelAdminProperties,
) {
    companion object {
        private val DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
        private const val LOGO_RESOURCE_PATH = "/assets/logo.png"
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

        val data = PrivacyNoticePdfData(
            logoContentType = MimeTypeUtils.IMAGE_PNG_VALUE,
            logoBytes = loadLogoBytes(),
            householdId = household.householdId.toString(),
            fullName = listOfNotNull(mainPerson?.firstname, mainPerson?.lastname).joinToString(" ").ifBlank { "-" },
            issuedAtDate = LocalDate.now(clock).format(DATE_FORMATTER),
            retentionText = RetentionPeriodFormatter.format(tafelAdminProperties.householdDeletion.retentionTime),
            generatedAt = LocalDate.now(clock).format(DATE_FORMATTER),
            auditRetentionDays = tafelAdminProperties.audit.retentionDays.toString(),
        )
        return pdfService.generatePdf(data, "/pdf-templates/customer-pdf/privacy-notice-document.xsl")
    }

    /**
     * The blank counterpart to [generatePrivacyNoticePdf] - a template an operator can print and hand
     * to a walk-in before a household even exists, with no household/name/date reference to fill in.
     * Reached from the customer search screen, not customer-detail, since that is where staff stand
     * before a case record exists.
     */
    fun generatePrivacyNoticeTemplatePdf(): ByteArray {
        val data = PrivacyNoticePdfData(
            logoContentType = MimeTypeUtils.IMAGE_PNG_VALUE,
            logoBytes = loadLogoBytes(),
            householdId = "",
            fullName = "",
            issuedAtDate = "",
            retentionText = RetentionPeriodFormatter.format(tafelAdminProperties.householdDeletion.retentionTime),
            generatedAt = LocalDate.now(clock).format(DATE_FORMATTER),
            auditRetentionDays = tafelAdminProperties.audit.retentionDays.toString(),
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
                .filterNot { it.excludeFromHousehold }
                .filter { it.birthDate != null }
                .count { Period.between(it.birthDate, LocalDate.now(clock)).years < 3 }

        return PdfData(
            logoContentType = MimeTypeUtils.IMAGE_PNG_VALUE,
            logoBytes = loadLogoBytes(),
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
        lastname = person.lastname ?: "-",
        firstname = person.firstname ?: "-",
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
        val qrCode = QRCode.ofSquares()
            .withErrorCorrectionLevel(ErrorCorrectionLevel.MEDIUM)
            .withInformationDensity(6)
            .withLogo(loadLogoBytes(), 250, 119)
            .build(data)
        return qrCode.renderToBytes()
    }

    private fun loadLogoBytes(): ByteArray = IOUtils.toByteArray(javaClass.getResourceAsStream(LOGO_RESOURCE_PATH))
}
