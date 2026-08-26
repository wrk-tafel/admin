package at.wrk.tafel.admin.backend.modules.household.internal

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.pdf.PDFService
import at.wrk.tafel.admin.backend.database.common.audit.AuditLogWriter
import at.wrk.tafel.admin.backend.database.common.audit.AuditOperation
import at.wrk.tafel.admin.backend.database.model.base.Gender
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionHouseholdRepository
import at.wrk.tafel.admin.backend.database.model.household.DocumentEntity
import at.wrk.tafel.admin.backend.database.model.household.DocumentRepository
import at.wrk.tafel.admin.backend.database.model.household.DocumentType
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.modules.household.HouseholdResponse
import at.wrk.tafel.admin.backend.modules.household.internal.converter.HouseholdConverter
import at.wrk.tafel.admin.backend.modules.household.internal.document.DocumentStorageService
import at.wrk.tafel.admin.backend.modules.household.internal.note.HouseholdNoteItem
import at.wrk.tafel.admin.backend.modules.household.internal.note.HouseholdNoteService
import org.apache.commons.io.IOUtils
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.util.MimeTypeUtils
import java.io.ByteArrayOutputStream
import java.math.BigDecimal
import java.math.RoundingMode
import java.text.NumberFormat
import java.time.Clock
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

/**
 * The GDPR Art. 15/20 data takeout for a household (issue #3179, see
 * `docs/architecture/adr/0051-data-subject-requests-delegate-to-each-areas-own-export-and-delete.md`)
 * - one downloadable ZIP containing the household record (persons, notes, distribution attendance
 * history and the list of uploaded documents) as a PDF, plus every uploaded document itself. One
 * combined archive rather than several separate downloads: a data-subject request normally wants
 * "everything you have on me" in one piece, and a requester who only wants part of it can simply
 * ignore the rest of the ZIP's contents.
 *
 * Stores nothing - the archive is built on request and never written to disk or a table.
 *
 * Deliberately excludes `audit_log` entries - left as an open question; see ADR-0051's Consequences.
 */
@Service
class HouseholdExportService(
    private val householdRepository: HouseholdRepository,
    private val householdConverter: HouseholdConverter,
    private val householdNoteService: HouseholdNoteService,
    private val distributionHouseholdRepository: DistributionHouseholdRepository,
    private val documentRepository: DocumentRepository,
    private val documentStorageService: DocumentStorageService,
    private val auditLogWriter: AuditLogWriter,
    private val pdfService: PDFService,
    private val clock: Clock,
) {

    companion object {
        private const val PDF_ENTRY_NAME = "datenexport.pdf"
        private const val LOGO_RESOURCE_PATH = "/assets/logo.png"
        private const val PDF_STYLESHEET_PATH = "/pdf-templates/household-export/export-document.xsl"
        private val DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
        private val DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm")

        private val DOCUMENT_TYPE_TITLES = mapOf(
            DocumentType.PROOF_OF_INCOME to "Einkommensnachweis",
            DocumentType.ID to "Ausweis",
            DocumentType.PRIVACY_NOTICE to "Datenschutzerklärung (unterschrieben)",
            DocumentType.OTHER to "Sonstiges",
        )
    }

    /**
     * Not read-only: this is one of the sensitive-handful reads recorded in `audit_log` (see issue
     * #3180), and [AuditLogWriter.record]'s write only takes effect for a transaction that actually
     * commits as one - see [AuditLogWriter]'s `beforeCommit`.
     */
    @Transactional
    fun exportHousehold(householdId: Long): HouseholdExportFileResult? {
        val household = householdRepository.findByHouseholdId(householdId) ?: return null
        recordExportRead(household)

        val householdResponse = householdConverter.mapEntityToHousehold(household)
        val notes = householdNoteService.getAllNotes(householdId)
        val attendances = distributionHouseholdRepository.findAllByHouseholdEntityIds(listOf(household.id!!))
            .sortedByDescending { it.distribution.startedAt }
            .map {
                HouseholdAttendance(
                    distributionId = it.distribution.id!!,
                    distributionStartedAt = it.distribution.startedAt,
                    distributionEndedAt = it.distribution.endedAt,
                    ticketNumber = it.ticketNumber,
                    processed = it.processed,
                    costContributionPaid = it.costContributionPaid,
                )
            }
        val documents = documentRepository.findAllByHouseholdHouseholdIdOrderByCreatedAtDesc(householdId)

        val exportedAt = LocalDateTime.now(clock).format(DATE_TIME_FORMATTER)
        val masterDataFields = buildMasterDataFields(householdResponse)
        val personRows = buildPersonRows(householdResponse)
        val noteRows = buildNoteRows(notes)
        val attendanceRows = buildAttendanceRows(attendances)
        val documentRows = buildDocumentRows(documents)

        val buffer = ByteArrayOutputStream()
        ZipOutputStream(buffer).use { zip ->
            // Reserving the export's own file name first means an actual "datenexport.pdf" upload
            // gets renamed instead of silently overwriting the export's own data file - same dedup
            // mechanism as the documents below.
            val usedEntryNames = mutableSetOf(PDF_ENTRY_NAME)

            zip.putNextEntry(ZipEntry(PDF_ENTRY_NAME))
            zip.write(buildHouseholdPdf(householdResponse.id, exportedAt, masterDataFields, personRows, noteRows, attendanceRows, documentRows))
            zip.closeEntry()

            // Two documents can legitimately share a fileName (e.g. two "Einkommensnachweis.pdf"
            // uploads), which a ZIP cannot: a second entry of the same name overwrites the first on
            // extraction instead of erroring, silently dropping a document from the export.
            documents.forEach { document ->
                val entryName = uniqueZipEntryName(document.fileName, usedEntryNames)
                zip.putNextEntry(ZipEntry(entryName))
                zip.write(documentStorageService.read(document.storagePath))
                zip.closeEntry()
            }
        }

        return HouseholdExportFileResult(
            filename = buildHouseholdFilename("datenexport", household, "zip"),
            bytes = buffer.toByteArray(),
        )
    }

    private fun buildMasterDataFields(household: HouseholdResponse): List<HouseholdExportField> {
        val address = household.address
        val addressLine = listOfNotNull(
            listOfNotNull(address.street, address.houseNumber).joinToString(" ").ifBlank { null },
            address.stairway?.let { "Stiege $it" },
            address.door?.let { "Tür $it" },
        ).joinToString(", ")
        val cityLine = listOfNotNull(address.postalCode?.toString(), address.city).joinToString(" ")

        val fields = mutableListOf(
            HouseholdExportField("Adresse", addressLine.orDash()),
            HouseholdExportField("PLZ / Ort", cityLine.orDash()),
            HouseholdExportField("Telefonnummer", household.telephoneNumber.orDash()),
            HouseholdExportField("E-Mail", household.email.orDash()),
            HouseholdExportField("Gültig bis", household.validUntil?.format(DATE_FORMATTER).orDash()),
            HouseholdExportField("Alleinerziehend", household.singleParent?.yesNo().orDash()),
            HouseholdExportField("Offener Unkostenbeitrag", household.pendingCostContribution?.formatCurrency().orDash()),
            HouseholdExportField("Gesperrt", household.locked?.yesNo().orDash()),
        )
        if (household.locked == true) {
            fields += HouseholdExportField("Gesperrt seit", household.lockedAt?.format(DATE_TIME_FORMATTER).orDash())
            fields += HouseholdExportField("Gesperrt von", household.lockedBy.orDash())
            fields += HouseholdExportField("Sperrgrund", household.lockReason.orDash())
        }
        fields += HouseholdExportField("Ausgestellt am", household.issuedAt?.format(DATE_FORMATTER).orDash())
        fields += HouseholdExportField(
            "Ausgestellt von",
            household.issuer?.let { "${it.lastname} ${it.firstname} (${it.personnelNumber})" }.orDash(),
        )
        return fields
    }

    private fun buildPersonRows(household: HouseholdResponse): List<HouseholdExportPersonRow> = household.persons
        .sortedByDescending { it.isMainPerson }
        .map { person ->
            HouseholdExportPersonRow(
                name = listOfNotNull(person.lastname, person.firstname).joinToString(" "),
                mainPerson = person.isMainPerson.yesNo(),
                birthDate = person.birthDate?.format(DATE_FORMATTER).orDash(),
                gender = person.gender?.let { Gender.valueOf(it.name).title }.orDash(),
                country = person.country.name,
                employer = person.employer.orDash(),
                income = person.income?.formatCurrency().orDash(),
                incomeDue = person.incomeDue?.format(DATE_FORMATTER).orDash(),
                familyAllowance = person.receivesFamilyAllowance.yesNo(),
                excludeFromHousehold = person.excludeFromHousehold.yesNo(),
            )
        }

    private fun buildNoteRows(notes: List<HouseholdNoteItem>): List<HouseholdExportNoteRow> = notes
        .sortedByDescending { it.timestamp }
        .map {
            HouseholdExportNoteRow(
                timestamp = it.timestamp.format(DATE_TIME_FORMATTER),
                author = it.author.orDash(),
                note = it.note,
            )
        }

    private fun buildAttendanceRows(attendances: List<HouseholdAttendance>): List<HouseholdExportAttendanceRow> = attendances.map {
        HouseholdExportAttendanceRow(
            startedAt = it.distributionStartedAt.format(DATE_TIME_FORMATTER),
            endedAt = it.distributionEndedAt?.format(DATE_TIME_FORMATTER).orDash(),
            ticketNumber = it.ticketNumber,
            processed = it.processed.yesNo(),
            costContributionPaid = it.costContributionPaid.yesNo(),
        )
    }

    private fun buildDocumentRows(documents: List<DocumentEntity>): List<HouseholdExportDocumentRow> = documents.map {
        HouseholdExportDocumentRow(
            fileName = it.fileName,
            documentType = DOCUMENT_TYPE_TITLES[it.documentType] ?: it.documentType.name,
            uploadedAt = it.createdAt?.format(DATE_TIME_FORMATTER).orDash(),
        )
    }

    private fun buildHouseholdPdf(
        householdId: Long?,
        exportedAt: String,
        masterDataFields: List<HouseholdExportField>,
        personRows: List<HouseholdExportPersonRow>,
        noteRows: List<HouseholdExportNoteRow>,
        attendanceRows: List<HouseholdExportAttendanceRow>,
        documentRows: List<HouseholdExportDocumentRow>,
    ): ByteArray {
        val data = HouseholdExportPdfData(
            logoContentType = MimeTypeUtils.IMAGE_PNG_VALUE,
            logoBytes = loadLogoBytes(),
            householdId = householdId ?: 0,
            exportedAt = exportedAt,
            masterData = masterDataFields,
            persons = personRows,
            notes = noteRows,
            attendances = attendanceRows,
            documents = documentRows,
        )
        return pdfService.generatePdf(data, PDF_STYLESHEET_PATH)
    }

    private fun loadLogoBytes(): ByteArray = IOUtils.toByteArray(javaClass.getResourceAsStream(LOGO_RESOURCE_PATH))

    private fun String?.orDash(): String = if (isNullOrBlank()) "-" else this

    private fun Boolean.yesNo(): String = if (this) "Ja" else "Nein"

    private fun BigDecimal.formatCurrency(): String = NumberFormat.getCurrencyInstance().format(setScale(2, RoundingMode.HALF_EVEN))

    private fun uniqueZipEntryName(fileName: String, usedEntryNames: MutableSet<String>): String {
        var candidate = fileName
        var suffix = 1
        while (!usedEntryNames.add(candidate)) {
            val extension = fileName.substringAfterLast('.', missingDelimiterValue = "")
            val base = fileName.substringBeforeLast('.', missingDelimiterValue = fileName)
            candidate = if (extension.isBlank()) "${base}_${++suffix}" else "${base}_${++suffix}.$extension"
        }
        return candidate
    }

    private fun recordExportRead(household: HouseholdEntity) {
        auditLogWriter.record(
            AuditLogWriter.PendingEntry(
                entityType = "Household",
                entityId = household.id,
                businessKey = household.householdId.toString(),
                operation = AuditOperation.READ,
                changedFields = emptyMap(),
            ),
        )
    }
}

@ExcludeFromTestCoverage
data class HouseholdExportFileResult(
    val filename: String,
    val bytes: ByteArray,
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as HouseholdExportFileResult

        if (filename != other.filename) return false
        return bytes.contentEquals(other.bytes)
    }

    override fun hashCode(): Int {
        var result = filename.hashCode()
        result = 31 * result + bytes.contentHashCode()
        return result
    }
}

/**
 * One distribution a household attended - part of [HouseholdExportService]'s data export. Bare, not
 * `Item`-suffixed: it's never bound to a controller signature, only used internally to render the
 * exported PDF's attendance table.
 */
@ExcludeFromTestCoverage
data class HouseholdAttendance(
    val distributionId: Long,
    val distributionStartedAt: LocalDateTime,
    val distributionEndedAt: LocalDateTime?,
    val ticketNumber: Int,
    val processed: Boolean,
    val costContributionPaid: Boolean,
)
