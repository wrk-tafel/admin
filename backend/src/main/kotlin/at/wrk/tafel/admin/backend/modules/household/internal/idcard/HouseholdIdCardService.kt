package at.wrk.tafel.admin.backend.modules.household.internal.idcard

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.mail.MailAttachment
import at.wrk.tafel.admin.backend.common.mail.MailSenderService
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.common.audit.AuditLogWriter
import at.wrk.tafel.admin.backend.database.common.audit.AuditOperation
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.modules.base.exception.BusinessRuleException
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.household.HouseholdIdCardFormat
import at.wrk.tafel.admin.backend.modules.household.internal.buildHouseholdFilename
import at.wrk.tafel.admin.backend.modules.household.internal.masterdata.HouseholdPdfService
import org.slf4j.LoggerFactory
import org.springframework.core.io.ByteArrayResource
import org.springframework.http.MediaType
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.thymeleaf.context.Context

/**
 * The ID card in the forms a customer keeps on a phone instead of in a pocket - a card-sized PDF, the
 * same card as an image, and a wallet file for Android - either downloaded by the operator or mailed to the
 * address stored on the household.
 *
 * The mail only ever goes to that stored address. The request names formats, never a recipient: an
 * address typed into a dialog is one typo away from handing a card to a stranger, while the stored
 * one is the one the household gave and that shows on its record.
 *
 * Both methods are read-write transactions. Each records a `READ` on the audit trail, like the
 * printed card's `HouseholdService.generatePdf`, and queuing a mail is a write of its own
 * (`MailOutboxService.enqueue`).
 */
@Service
class HouseholdIdCardService(
    private val householdRepository: HouseholdRepository,
    private val householdPdfService: HouseholdPdfService,
    private val walletPassService: WalletPassService,
    private val mailSenderService: MailSenderService,
    private val auditLogWriter: AuditLogWriter,
    private val tafelAdminProperties: TafelAdminProperties,
) {

    companion object {
        private val log = LoggerFactory.getLogger(HouseholdIdCardService::class.java)

        /** The key under which the audit trail shows that, and in which formats, a card was mailed. */
        const val AUDIT_FIELD_SENT_BY_MAIL = "idCardSentByMail"
    }

    @Transactional
    fun generateIdCard(householdId: Long, format: HouseholdIdCardFormat): HouseholdIdCardFile {
        val household = findHousehold(householdId)
        val file = render(household, format)
        recordRead(household, changedFields = emptyMap())
        return file
    }

    @Transactional
    fun sendIdCardByMail(householdId: Long, formats: Set<HouseholdIdCardFormat>) {
        if (!tafelAdminProperties.idCardMailAvailable) {
            throw BusinessRuleException("Der E-Mail-Versand von Ausweisen ist nicht eingerichtet!")
        }
        if (formats.isEmpty()) {
            throw BusinessRuleException("Es muss mindestens ein Format ausgewählt werden!")
        }

        val household = findHousehold(householdId)
        val address = household.email?.trim()
        if (address.isNullOrBlank()) {
            throw BusinessRuleException("Für diesen Kunden ist keine E-Mail-Adresse hinterlegt!")
        }

        // In the enum's order rather than the request's, so the same selection always produces the
        // same mail.
        val orderedFormats = HouseholdIdCardFormat.entries.filter { it in formats }
        val attachments = orderedFormats
            .map { render(household, it) }
            .map { MailAttachment(it.filename, ByteArrayResource(it.bytes), it.contentType) }

        val context = Context().apply {
            setVariable("greeting", "Guten Tag,")
            setVariable("householdId", household.householdId)
            setVariable("hasPdf", HouseholdIdCardFormat.PDF in formats)
            setVariable("hasImage", HouseholdIdCardFormat.IMAGE in formats)
            setVariable("hasWallet", HouseholdIdCardFormat.WALLET in formats)
        }
        mailSenderService.sendHtmlMailTo(
            mailType = "Digitaler Ausweis",
            recipients = listOf(address),
            subject = "Ihre Bezugskarte der Team Österreich Tafel",
            attachments = attachments,
            templateName = "mails/id-card-mail",
            context = context,
        )

        recordRead(
            household,
            changedFields = mapOf(AUDIT_FIELD_SENT_BY_MAIL to listOf(null, orderedFormats.joinToString(", ") { it.auditLabel })),
        )
        log.info("Queued ID card mail for household {} ({})", householdId, orderedFormats.joinToString(", "))
    }

    // The audit trail is read by people, in the same words the dialog offers the formats in.
    private val HouseholdIdCardFormat.auditLabel: String
        get() = when (this) {
            HouseholdIdCardFormat.PDF -> "PDF"
            HouseholdIdCardFormat.IMAGE -> "Bild"
            HouseholdIdCardFormat.WALLET -> "Wallet-Karte"
        }

    private fun findHousehold(householdId: Long): HouseholdEntity = householdRepository.findByHouseholdId(householdId)
        ?: throw NotFoundException("Kunde Nr. $householdId nicht vorhanden!")

    private fun render(household: HouseholdEntity, format: HouseholdIdCardFormat): HouseholdIdCardFile = when (format) {
        HouseholdIdCardFormat.PDF -> HouseholdIdCardFile(
            filename = buildHouseholdFilename("ausweis", household, "pdf"),
            contentType = MediaType.APPLICATION_PDF_VALUE,
            bytes = householdPdfService.generateDigitalIdCardPdf(household),
        )

        HouseholdIdCardFormat.IMAGE -> HouseholdIdCardFile(
            filename = buildHouseholdFilename("ausweis", household, "png"),
            contentType = MediaType.IMAGE_PNG_VALUE,
            bytes = householdPdfService.generateDigitalIdCardImage(household),
        )

        HouseholdIdCardFormat.WALLET -> {
            if (!tafelAdminProperties.walletPassAvailable) {
                throw BusinessRuleException("Wallet-Karten sind in dieser Umgebung deaktiviert!")
            }
            HouseholdIdCardFile(
                filename = buildHouseholdFilename("ausweis", household, "pkpass"),
                contentType = WalletPassService.CONTENT_TYPE,
                bytes = walletPassService.generatePass(householdPdfService.createIdCardSummary(household)),
            )
        }
    }

    private fun recordRead(household: HouseholdEntity, changedFields: Map<String, List<Any?>>) {
        auditLogWriter.record(
            AuditLogWriter.PendingEntry(
                entityType = "Household",
                entityId = household.id,
                businessKey = household.householdId.toString(),
                operation = AuditOperation.READ,
                changedFields = changedFields,
            ),
        )
    }
}

@ExcludeFromTestCoverage
class HouseholdIdCardFile(
    val filename: String,
    val contentType: String,
    val bytes: ByteArray,
)
