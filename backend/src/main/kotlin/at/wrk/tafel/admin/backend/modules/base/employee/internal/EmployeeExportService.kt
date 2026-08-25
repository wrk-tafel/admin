package at.wrk.tafel.admin.backend.modules.base.employee.internal

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.pdf.PDFService
import at.wrk.tafel.admin.backend.database.common.audit.AuditLogWriter
import at.wrk.tafel.admin.backend.database.common.audit.AuditOperation
import at.wrk.tafel.admin.backend.database.common.audit.AuditScope
import at.wrk.tafel.admin.backend.database.model.base.EmployeeEntity
import at.wrk.tafel.admin.backend.database.model.base.EmployeeRepository
import at.wrk.tafel.admin.backend.modules.base.employee.EmployeeExportField
import at.wrk.tafel.admin.backend.modules.base.employee.EmployeeExportPdfData
import org.apache.commons.io.IOUtils
import org.apache.commons.lang3.StringUtils
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.util.MimeTypeUtils
import java.time.Clock
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

/**
 * The GDPR Art. 15/20 data takeout for an employee record that has no linked `users` account -
 * issue #3394, the gap `UserExportService` (issue #3363) leaves open for a driver/co-driver or
 * similar who is only ever referenced, never logged in. Master data only (personnel number, name,
 * created date): an `EmployeeEntity` holds nothing else. Reachable admin-triggered from the
 * Mitarbeiter settings screen, behind `SETTINGS` rather than `USER_MANAGEMENT` - there is no
 * self-service angle, since such an employee has no account of their own to authenticate with.
 *
 * Stores nothing - the PDF is built on request and never written to disk or a table.
 */
@Service
class EmployeeExportService(
    private val employeeRepository: EmployeeRepository,
    private val auditLogWriter: AuditLogWriter,
    private val pdfService: PDFService,
    private val clock: Clock,
) {

    companion object {
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
        recordExportRead(employeeEntity)

        val data = EmployeeExportPdfData(
            logoContentType = MimeTypeUtils.IMAGE_PNG_VALUE,
            logoBytes = loadLogoBytes(),
            exportedAt = LocalDateTime.now(clock).format(DATE_TIME_FORMATTER),
            masterData = buildMasterData(employeeEntity),
        )

        return EmployeeExportFileResult(
            filename = buildFilename(employeeEntity),
            bytes = pdfService.generatePdf(data, PDF_STYLESHEET_PATH),
        )
    }

    private fun buildMasterData(employeeEntity: EmployeeEntity): List<EmployeeExportField> = listOf(
        EmployeeExportField("Personalnummer", employeeEntity.personnelNumber),
        EmployeeExportField("Name", "${employeeEntity.lastname} ${employeeEntity.firstname}"),
        EmployeeExportField("Angelegt am", employeeEntity.createdAt?.format(DATE_TIME_FORMATTER) ?: "-"),
    )

    private fun loadLogoBytes(): ByteArray = IOUtils.toByteArray(javaClass.getResourceAsStream(LOGO_RESOURCE_PATH))

    /**
     * "<prefix>-<personnelNumber>.pdf" - same accent-stripping/lowercasing safety net as
     * `UserExportService.buildFilename`, since a personnel number is free text rather than a
     * guaranteed-ASCII identifier.
     */
    private fun buildFilename(employeeEntity: EmployeeEntity): String =
        StringUtils.stripAccents("mitarbeiterdaten-${employeeEntity.personnelNumber}")
            .lowercase()
            .replace("ß", "ss")
            .replace("[^a-z0-9]".toRegex(), "-") + ".pdf"

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
