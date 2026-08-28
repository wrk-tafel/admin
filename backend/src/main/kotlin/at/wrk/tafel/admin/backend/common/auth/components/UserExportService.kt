package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.auth.model.UserExportField
import at.wrk.tafel.admin.backend.common.auth.model.UserExportLoginRow
import at.wrk.tafel.admin.backend.common.auth.model.UserExportPdfData
import at.wrk.tafel.admin.backend.common.auth.model.UserExportPermissionRow
import at.wrk.tafel.admin.backend.common.auth.model.UserExportPushDeviceRow
import at.wrk.tafel.admin.backend.common.auth.model.UserExportPushTypePreferenceRow
import at.wrk.tafel.admin.backend.common.auth.model.UserPermissions
import at.wrk.tafel.admin.backend.common.pdf.PDFService
import at.wrk.tafel.admin.backend.database.common.audit.AuditLogWriter
import at.wrk.tafel.admin.backend.database.common.audit.AuditOperation
import at.wrk.tafel.admin.backend.database.common.audit.AuditScope
import at.wrk.tafel.admin.backend.database.model.audit.AuditLogRepository
import at.wrk.tafel.admin.backend.database.model.auth.LoginAttemptRepository
import at.wrk.tafel.admin.backend.database.model.auth.UserEntity
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.push.PushNotificationType
import at.wrk.tafel.admin.backend.database.model.push.PushPreferencesRepository
import at.wrk.tafel.admin.backend.database.model.push.PushSubscriptionRepository
import at.wrk.tafel.admin.backend.database.model.push.PushTypePreferenceRepository
import org.apache.commons.io.IOUtils
import org.apache.commons.lang3.StringUtils
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.util.MimeTypeUtils
import java.time.Clock
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

/**
 * The GDPR Art. 15/20 data takeout for a staff member (issue #3363, see
 * `docs/architecture/adr/0051-data-subject-requests-delegate-to-each-areas-own-export-and-delete.md`)
 * - a PDF with the account's master data, its permissions, registered push devices/preferences and
 * failed-login/login history, mirroring the household export's own PDF (`HouseholdExportService`).
 * Reachable two ways: self-service from the user menu ([exportUserByUsername]), and admin-triggered
 * from a user's detail screen ([exportUserById], behind `USER_MANAGEMENT`) for a request made on
 * someone's behalf. Never the password hash.
 *
 * Stores nothing - the PDF is built on request and never written to disk or a table.
 *
 * Every other module's `audit_log` entry is excluded from this export (see
 * [AuditScope.USER_LOGIN_ENTITY_TYPE]'s siblings, and ADR-0051's Consequences) - a write this user
 * made to a household, another account or a setting is substantively *that* record's data, with this
 * user's name attached only as attribution. [AuditScope.USER_LOGIN_ENTITY_TYPE] entries are the one
 * exception ([buildLoginRows]): a login event's subject and actor are the same person, so it is this
 * user's own data, not another record's - unlike the rest of `audit_log`, there is no boundary
 * question in surfacing it here.
 */
@Service
class UserExportService(
    private val userRepository: UserRepository,
    private val pushSubscriptionRepository: PushSubscriptionRepository,
    private val pushPreferencesRepository: PushPreferencesRepository,
    private val pushTypePreferenceRepository: PushTypePreferenceRepository,
    private val loginAttemptRepository: LoginAttemptRepository,
    private val auditLogRepository: AuditLogRepository,
    private val auditLogWriter: AuditLogWriter,
    private val pdfService: PDFService,
    private val clock: Clock,
) {

    companion object {
        private const val LOGO_RESOURCE_PATH = "/assets/logo.png"
        private const val PDF_STYLESHEET_PATH = "/pdf-templates/user-export/export-document.xsl"
        private val DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm")

        /** Mirrors the frontend's `pushNotificationTypeLabel` (`app/api/push-api.service.ts`). */
        private val PUSH_NOTIFICATION_TYPE_TITLES = mapOf(
            PushNotificationType.DISTRIBUTION_STARTED to "Ausgabe gestartet",
            PushNotificationType.DISTRIBUTION_CLOSED to "Ausgabe beendet",
            PushNotificationType.DISTRIBUTION_STILL_OPEN to "Ausgabe noch offen",
            PushNotificationType.CHECKIN_STARTED to "Anmeldung gestartet",
            PushNotificationType.FOOD_HANDOUT_STARTED to "Warenausgabe gestartet",
            PushNotificationType.ALL_TICKETS_PROCESSED to "Alle Kunden abgearbeitet",
            PushNotificationType.ROUTE_AT_LAST_STOP to "Route beim letzten Stopp",
            PushNotificationType.FOOD_COLLECTION_COMPLETED to "Warenerfassung abgeschlossen",
            PushNotificationType.USER_LOCKED_OUT to "Benutzer gesperrt",
            PushNotificationType.REPORT_MAIL_FAILED to "E-Mail nicht versendet",
            PushNotificationType.EXCESSIVE_READ_ACCESS to "Ungewöhnlich viele Zugriffe",
        )
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

        val userId = userEntity.id!!
        val actorNames = resolveActorNames(userEntity.authorities.map { it.createdBy })

        val data = UserExportPdfData(
            logoContentType = MimeTypeUtils.IMAGE_PNG_VALUE,
            logoBytes = loadLogoBytes(),
            exportedAt = LocalDateTime.now(clock).format(DATE_TIME_FORMATTER),
            masterData = buildMasterData(userEntity),
            permissions = buildPermissionRows(userEntity, actorNames),
            pushDevices = buildPushDeviceRows(userId),
            pushTypePreferences = buildPushTypePreferenceRows(userId),
            loginAttempt = buildLoginAttemptFields(userEntity.username),
            logins = buildLoginRows(userEntity.username),
        )

        return UserExportFileResult(
            filename = buildFilename(userEntity),
            bytes = pdfService.generatePdf(data, PDF_STYLESHEET_PATH),
        )
    }

    private fun buildMasterData(userEntity: UserEntity): List<UserExportField> {
        val pushEnabled = pushPreferencesRepository.findByUserId(userEntity.id!!)?.enabled
        return listOf(
            UserExportField("Benutzername", userEntity.username),
            UserExportField("Personalnummer", userEntity.employee.personnelNumber),
            UserExportField("Name", "${userEntity.employee.lastname} ${userEntity.employee.firstname}"),
            UserExportField("Aktiv", userEntity.enabled.yesNo()),
            UserExportField("Passwortänderung erforderlich", userEntity.passwordChangeRequired.yesNo()),
            UserExportField("Konto erstellt am", userEntity.createdAt?.format(DATE_TIME_FORMATTER) ?: "-"),
            UserExportField("Letzter Login", userEntity.lastLogin?.format(DATE_TIME_FORMATTER) ?: "-"),
            // Absence of a row means "not customized" (default: enabled) rather than "disabled" - see
            // `PushPreferencesService`'s KDoc - so this is left as "-" rather than defaulted to "Ja".
            UserExportField("Push-Benachrichtigungen aktiviert", pushEnabled?.yesNo() ?: "-"),
        )
    }

    private fun buildPermissionRows(userEntity: UserEntity, actorNames: Map<Long, String>): List<UserExportPermissionRow> = userEntity.authorities
        .map { it to UserPermissions.valueOfKey(it.name) }
        .sortedWith(compareBy({ it.second.category.title }, { it.second.title }))
        .map { (authority, permission) ->
            UserExportPermissionRow(
                category = permission.category.title,
                title = permission.title,
                grantedAt = authority.createdAt?.format(DATE_TIME_FORMATTER) ?: "-",
                grantedBy = authority.createdBy?.let { actorNames[it] } ?: "-",
            )
        }

    private fun buildPushDeviceRows(userId: Long): List<UserExportPushDeviceRow> = pushSubscriptionRepository.findAllByUserId(userId).map {
        UserExportPushDeviceRow(
            label = it.label ?: "-",
            endpoint = it.endpoint ?: "-",
            userAgent = it.userAgent ?: "-",
            registeredAt = it.createdAt?.format(DATE_TIME_FORMATTER) ?: "-",
        )
    }

    /**
     * Only the persisted opt-outs - a notification type with no row here is not customized (default:
     * enabled), see `PushPreferencesService`'s KDoc, so it is not listed as if it were a decision this
     * user made.
     */
    private fun buildPushTypePreferenceRows(userId: Long): List<UserExportPushTypePreferenceRow> = pushTypePreferenceRepository.findAllByUserId(userId).map {
        UserExportPushTypePreferenceRow(
            type = it.notificationType?.let { type -> PUSH_NOTIFICATION_TYPE_TITLES[type] ?: type.name } ?: "-",
            enabled = it.enabled.yesNo(),
        )
    }

    private fun buildLoginAttemptFields(username: String): List<UserExportField> {
        val loginAttempt = loginAttemptRepository.findByUsername(username) ?: return emptyList()
        return listOf(
            UserExportField("Fehlgeschlagene Anmeldeversuche", loginAttempt.failureCount.toString()),
            UserExportField("Letzter Fehlversuch", loginAttempt.lastFailureAt.format(DATE_TIME_FORMATTER)),
            UserExportField("Gesperrt bis", loginAttempt.lockedUntil?.format(DATE_TIME_FORMATTER) ?: "-"),
        )
    }

    /**
     * A login's audit entry is this user's own data (see the class KDoc), bounded the same way the
     * "Zugriffsprotokoll" screen is - by `tafeladmin.audit.retentionDays` (30 days by default), since
     * `AuditRetentionService` deletes anything older regardless of entity type.
     */
    private fun buildLoginRows(username: String): List<UserExportLoginRow> = auditLogRepository
        .findAllByBusinessKeyAndEntityTypeInOrderByOccurredAtDescIdDesc(
            businessKey = username,
            entityTypes = listOf(AuditScope.USER_LOGIN_ENTITY_TYPE),
            pageable = Pageable.unpaged(),
        )
        .content
        .map { UserExportLoginRow(occurredAt = it.occurredAt.format(DATE_TIME_FORMATTER)) }

    /**
     * `UserAuthorityEntity.createdBy` is a plain user id, not a relation (see
     * [at.wrk.tafel.admin.backend.database.model.base.BaseChangeTrackingEntity]) - one batched lookup
     * for the whole export rather than one query per permission row.
     */
    private fun resolveActorNames(userIds: Collection<Long?>): Map<Long, String> {
        val distinctIds = userIds.filterNotNull().distinct()
        if (distinctIds.isEmpty()) return emptyMap()

        return userRepository.findAllById(distinctIds).associate {
            it.id!! to "${it.employee.personnelNumber} ${it.employee.firstname} ${it.employee.lastname}"
        }
    }

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
