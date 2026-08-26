package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.auth.model.UserExportField
import at.wrk.tafel.admin.backend.common.auth.model.UserExportPdfData
import at.wrk.tafel.admin.backend.common.auth.model.UserExportPermissionRow
import at.wrk.tafel.admin.backend.common.auth.model.UserPermissions
import at.wrk.tafel.admin.backend.common.pdf.PDFService
import at.wrk.tafel.admin.backend.database.common.audit.AuditLogWriter
import at.wrk.tafel.admin.backend.database.common.audit.AuditOperation
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import org.apache.commons.io.IOUtils
import org.apache.commons.lang3.StringUtils
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.util.MimeTypeUtils
import java.time.Clock
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

/**
 * The GDPR Art. 15/20 data takeout for a staff member (issue #3363, see
 * `docs/architecture/gdpr-data-takeout-plan.md` §3) - a PDF with the account's master data and its
 * permissions, mirroring the household export's own PDF (`HouseholdExportService`). Reachable two
 * ways: self-service from the user menu ([exportUserByUsername]), and admin-triggered from a user's
 * detail screen ([exportUserById], behind `USER_MANAGEMENT`) for a request made on someone's behalf.
 * Never the password hash.
 *
 * Stores nothing - the PDF is built on request and never written to disk or a table.
 */
@Service
class UserExportService(
    private val userRepository: UserRepository,
    private val auditLogWriter: AuditLogWriter,
    private val pdfService: PDFService,
    private val clock: Clock,
) {

    companion object {
        private const val LOGO_RESOURCE_PATH = "/assets/logo.png"
        private const val PDF_STYLESHEET_PATH = "/pdf-templates/user-export/export-document.xsl"
        private val DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm")
    }

    /**
     * Not read-only: this is one of the sensitive-handful reads recorded in `audit_log` (see issue
     * #3180), and [AuditLogWriter.record]'s write only takes effect for a transaction that actually
     * commits as one - see [AuditLogWriter]'s `beforeCommit`.
     */
    @Transactional
    fun exportUserByUsername(username: String): UserExportFileResult? = userRepository.findByUsername(username)?.let { export(it) }

    @Transactional
    fun exportUserById(userId: Long): UserExportFileResult? = userRepository.findById(userId).orElse(null)?.let { export(it) }

    private fun export(userEntity: UserEntity): UserExportFileResult {
        recordExportRead(userEntity)

        val data = UserExportPdfData(
            logoContentType = MimeTypeUtils.IMAGE_PNG_VALUE,
            logoBytes = loadLogoBytes(),
            exportedAt = LocalDateTime.now(clock).format(DATE_TIME_FORMATTER),
            masterData = buildMasterData(userEntity),
            permissions = buildPermissionRows(userEntity),
        )

        return UserExportFileResult(
            filename = buildFilename(userEntity),
            bytes = pdfService.generatePdf(data, PDF_STYLESHEET_PATH),
        )
    }

    private fun buildMasterData(userEntity: UserEntity): List<UserExportField> = listOf(
        UserExportField("Benutzername", userEntity.username),
        UserExportField("Personalnummer", userEntity.employee.personnelNumber),
        UserExportField("Name", "${userEntity.employee.lastname} ${userEntity.employee.firstname}"),
        UserExportField("Aktiv", userEntity.enabled.yesNo()),
        UserExportField("Passwortänderung erforderlich", userEntity.passwordChangeRequired.yesNo()),
        UserExportField("Letzter Login", userEntity.lastLogin?.format(DATE_TIME_FORMATTER) ?: "-"),
    )

    private fun buildPermissionRows(userEntity: UserEntity): List<UserExportPermissionRow> = userEntity.authorities
        .map { UserPermissions.valueOfKey(it.name) }
        .sortedWith(compareBy({ it.category.title }, { it.title }))
        .map { UserExportPermissionRow(category = it.category.title, title = it.title) }

    private fun loadLogoBytes(): ByteArray = IOUtils.toByteArray(javaClass.getResourceAsStream(LOGO_RESOURCE_PATH))

    private fun Boolean.yesNo(): String = if (this) "Ja" else "Nein"

    /**
     * "<prefix>-<username>.pdf" - a username is already the ASCII-safe identifier the rest of the
     * application addresses a user by, so unlike `buildHouseholdFilename` this needs no
     * name-composition, only the same accent-stripping/lowercasing safety net.
     */
    private fun buildFilename(userEntity: UserEntity): String = StringUtils.stripAccents("benutzerdaten-${userEntity.username}")
        .lowercase()
        .replace("ß", "ss")
        .replace("[^a-z0-9]".toRegex(), "-") + ".pdf"

    private fun recordExportRead(userEntity: UserEntity) {
        auditLogWriter.record(
            AuditLogWriter.PendingEntry(
                entityType = "User",
                entityId = userEntity.id,
                businessKey = userEntity.username,
                operation = AuditOperation.READ,
                changedFields = emptyMap(),
            ),
        )
    }
}

@ExcludeFromTestCoverage
data class UserExportFileResult(
    val filename: String,
    val bytes: ByteArray,
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as UserExportFileResult

        if (filename != other.filename) return false
        return bytes.contentEquals(other.bytes)
    }

    override fun hashCode(): Int {
        var result = filename.hashCode()
        result = 31 * result + bytes.contentHashCode()
        return result
    }
}
