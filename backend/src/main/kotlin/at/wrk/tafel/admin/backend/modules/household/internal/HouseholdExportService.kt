package at.wrk.tafel.admin.backend.modules.household.internal

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.common.audit.AuditLogWriter
import at.wrk.tafel.admin.backend.database.common.audit.AuditOperation
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionHouseholdRepository
import at.wrk.tafel.admin.backend.database.model.household.DocumentRepository
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.modules.household.HouseholdResponse
import at.wrk.tafel.admin.backend.modules.household.internal.converter.HouseholdConverter
import at.wrk.tafel.admin.backend.modules.household.internal.document.DocumentStorageService
import at.wrk.tafel.admin.backend.modules.household.internal.note.HouseholdNoteItem
import at.wrk.tafel.admin.backend.modules.household.internal.note.HouseholdNoteService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.json.JsonMapper
import java.io.ByteArrayOutputStream
import java.time.LocalDateTime
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

/**
 * The GDPR Art. 15/20 data takeout for a household (issue #3179, see
 * `docs/architecture/gdpr-data-takeout-plan.md`) - two independently downloadable pieces of "the
 * whole record" a customer could ask for:
 *
 * - [exportHousehold]: household, persons, notes and distribution attendance history as one JSON
 *   file.
 * - [exportDocuments]: every uploaded document as a ZIP.
 *
 * Split rather than one combined archive so a requester who only wants the record (the common case)
 * doesn't pay for zipping files they already gave the Tafel in the first place. Neither method
 * stores anything - the file is built on request and never written to disk or a table.
 *
 * Deliberately excludes `audit_log` entries - left as an open question in the takeout plan's §4
 * rather than answered by this service.
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
    private val jsonMapper: JsonMapper,
) {

    /**
     * Not read-only: this is one of the sensitive-handful reads recorded in `audit_log` (see issue
     * #3180), and [AuditLogWriter.record]'s write only takes effect for a transaction that actually
     * commits as one - see [AuditLogWriter]'s `beforeCommit`.
     */
    @Transactional
    fun exportHousehold(householdId: Long): HouseholdExportFileResult? {
        val household = householdRepository.findByHouseholdId(householdId) ?: return null
        recordExportRead(household)

        val export = HouseholdExportResponse(
            household = householdConverter.mapEntityToHousehold(household),
            notes = householdNoteService.getAllNotes(householdId),
            attendances = distributionHouseholdRepository.findAllByHouseholdEntityIds(listOf(household.id!!))
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
                },
        )

        return HouseholdExportFileResult(
            filename = buildHouseholdFilename("datenexport", household, "json"),
            bytes = jsonMapper.writeValueAsBytes(export),
        )
    }

    /**
     * Not read-only, same reasoning as [exportHousehold].
     */
    @Transactional
    fun exportDocuments(householdId: Long): HouseholdExportFileResult? {
        val household = householdRepository.findByHouseholdId(householdId) ?: return null
        recordExportRead(household)

        val documents = documentRepository.findAllByHouseholdHouseholdIdOrderByCreatedAtDesc(householdId)
        val buffer = ByteArrayOutputStream()
        ZipOutputStream(buffer).use { zip ->
            // Two documents can legitimately share a fileName (e.g. two "Einkommensnachweis.pdf"
            // uploads), which a ZIP cannot: a second entry of the same name overwrites the first on
            // extraction instead of erroring, silently dropping a document from the export.
            val usedEntryNames = mutableSetOf<String>()
            documents.forEach { document ->
                val entryName = uniqueZipEntryName(document.fileName, usedEntryNames)
                zip.putNextEntry(ZipEntry(entryName))
                zip.write(documentStorageService.read(document.storagePath))
                zip.closeEntry()
            }
        }

        return HouseholdExportFileResult(
            filename = buildHouseholdFilename("dokumente", household, "zip"),
            bytes = buffer.toByteArray(),
        )
    }

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
 * The JSON payload behind [HouseholdExportFileResult] for [HouseholdExportService.exportHousehold] -
 * household, persons and notes, plus distribution attendance history. Deliberately excludes uploaded
 * documents (see the separate [HouseholdExportService.exportDocuments] ZIP) and `audit_log` entries.
 * Never itself bound to a controller signature - it's serialized straight to the downloadable file's
 * bytes, the same way [HouseholdPdfResult] carries a PDF's bytes rather than a typed response body.
 */
@ExcludeFromTestCoverage
data class HouseholdExportResponse(
    val household: HouseholdResponse,
    val notes: List<HouseholdNoteItem>,
    val attendances: List<HouseholdAttendance>,
)

/**
 * One distribution a household attended - [HouseholdExportResponse]'s attendance history. Bare, not
 * `Item`-suffixed: it's a nested value embedded in that response only, never itself a request body,
 * a controller return type, or a paginated/list endpoint's element type - same reasoning as `Person`.
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
