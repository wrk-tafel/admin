package at.wrk.tafel.admin.backend.modules.base.employee.internal

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.pdf.PDFService
import at.wrk.tafel.admin.backend.database.common.audit.AuditLogWriter
import at.wrk.tafel.admin.backend.database.common.audit.AuditOperation
import at.wrk.tafel.admin.backend.database.common.audit.AuditScope
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity
import at.wrk.tafel.admin.backend.database.model.base.EmployeeRepository
import at.wrk.tafel.admin.backend.modules.base.employee.EmployeeExportField
import at.wrk.tafel.admin.backend.modules.base.employee.EmployeeExportJsonData
import at.wrk.tafel.admin.backend.modules.base.employee.EmployeeExportPdfData
import at.wrk.tafel.admin.backend.modules.base.exception.ConflictException
import org.apache.commons.io.IOUtils
import org.apache.commons.lang3.StringUtils
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.util.MimeTypeUtils
import tools.jackson.databind.json.JsonMapper
import java.io.ByteArrayOutputStream
import java.time.Clock
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

/**
 * The GDPR Art. 15/20 data takeout for an employee record that has no linked `users` account -
 * issue #3394, the gap `UserExportService` (issue #3363) leaves open for a driver/co-driver or
 * similar who is only ever referenced, never logged in. Master data only (personnel number, name,
 * created date): an `EmployeeEntity` holds nothing else. Reachable admin-triggered from the
 * Mitarbeiter settings screen, behind `SETTINGS` rather than `USER_MANAGEMENT` - there is no
 * self-service angle, since such an employee has no account of their own to authenticate with.
 *
 * Deliberately refuses an employee a `users` row already references: that account's own export
 * already carries this employee's personnel number and name as part of its master data
 * (`UserExportService.buildMasterData`), so a person is meant to have exactly one takeout document,
 * not a second, less complete one alongside it.
 *
 * A ZIP, not a bare PDF: alongside `datenexport.pdf` it carries the same master data as a
 * machine-readable `daten.json` (GDPR Art. 20, issue #3418), same shape as the household/user
 * exports.
 *
 * Stores nothing - the ZIP is built on request and never written to disk or a table.
 */
@Service
class EmployeeExportService(
    private val employeeRepository: EmployeeRepository,
    private val userRepository: UserRepository,
    private val auditLogWriter: AuditLogWriter,
    private val pdfService: PDFService,
    private val jsonMapper: JsonMapper,
    private val clock: Clock,
) {

    companion object {
        private const val PDF_ENTRY_NAME = "datenexport.pdf"
        private const val JSON_ENTRY_NAME = "daten.json"
        private const val LOGO_RESOURCE_PATH = "/assets/logo.png"
        private const val PDF_STYLESHEET_PATH = "/pdf-templates/employee-export/export-document.xsl"
        private val DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm")
    }

    /**
     * Not read-only: this is one of the sensitive-handful reads recorded in `audit_log` (see issue
     * #3180), and [AuditLogWriter.record]'s write only takes effect for a transaction that actually
     * commits as one - see [AuditLogWriter]'s `beforeCommit`.
     */
    @Transactional
    fun exportEmployeeById(employeeId: Long): EmployeeExportFileResult? {
        val employeeEntity = employeeRepository.findByIdOrNull(employeeId) ?: return null
        if (userRepository.existsByEmployeeId(employeeId)) {
            throw ConflictException("Mitarbeiter hat ein Benutzerkonto - Datenexport erfolgt über das Benutzerkonto!")
        }
        recordExportRead(employeeEntity)

        val exportedAt = LocalDateTime.now(clock).format(DATE_TIME_FORMATTER)
        val masterData = buildMasterData(employeeEntity)

        val pdfData = EmployeeExportPdfData(
            logoContentType = MimeTypeUtils.IMAGE_PNG_VALUE,
            logoBytes = loadLogoBytes(),
            exportedAt = exportedAt,
            masterData = masterData,
        )
        val jsonData = EmployeeExportJsonData(
            exportedAt = exportedAt,
            masterData = masterData,
        )

        val buffer = ByteArrayOutputStream()
        ZipOutputStream(buffer).use { zip ->
            zip.putNextEntry(ZipEntry(PDF_ENTRY_NAME))
            zip.write(pdfService.generatePdf(pdfData, PDF_STYLESHEET_PATH))
            zip.closeEntry()

            zip.putNextEntry(ZipEntry(JSON_ENTRY_NAME))
            zip.write(jsonMapper.writeValueAsBytes(jsonData))
            zip.closeEntry()
        }

        return EmployeeExportFileResult(
            filename = buildFilename(employeeEntity),
            bytes = buffer.toByteArray(),
        )
    }

    private fun buildMasterData(employeeEntity: EmployeeEntity): List<EmployeeExportField> = listOf(
        EmployeeExportField("Personalnummer", employeeEntity.personnelNumber),
        EmployeeExportField("Name", "${employeeEntity.lastname} ${employeeEntity.firstname}"),
        EmployeeExportField("Angelegt am", employeeEntity.createdAt?.format(DATE_TIME_FORMATTER) ?: "-"),
    )

    private fun loadLogoBytes(): ByteArray = IOUtils.toByteArray(javaClass.getResourceAsStream(LOGO_RESOURCE_PATH))

    /**
     * "<prefix>-<personnelNumber>.zip" - same accent-stripping/lowercasing safety net as
     * `UserExportService.buildFilename`, since a personnel number is free text rather than a
     * guaranteed-ASCII identifier.
     */
    private fun buildFilename(employeeEntity: EmployeeEntity): String = StringUtils.stripAccents("mitarbeiterdaten-${employeeEntity.personnelNumber}")
        .lowercase()
        .replace("ß", "ss")
        .replace("[^a-z0-9]".toRegex(), "-") + ".zip"

    private fun recordExportRead(employeeEntity: EmployeeEntity) {
        auditLogWriter.record(
            AuditLogWriter.PendingEntry(
                entityType = AuditScope.EMPLOYEE_EXPORT_ENTITY_TYPE,
                entityId = employeeEntity.id,
                businessKey = employeeEntity.personnelNumber,
                operation = AuditOperation.READ,
                changedFields = emptyMap(),
            ),
        )
    }
}

@ExcludeFromTestCoverage
data class EmployeeExportFileResult(
    val filename: String,
    val bytes: ByteArray,
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as EmployeeExportFileResult

        if (filename != other.filename) return false
        return bytes.contentEquals(other.bytes)
    }

    override fun hashCode(): Int {
        var result = filename.hashCode()
        result = 31 * result + bytes.contentHashCode()
        return result
    }
}
