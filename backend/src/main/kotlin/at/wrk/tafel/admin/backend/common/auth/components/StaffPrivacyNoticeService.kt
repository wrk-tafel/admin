package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.auth.model.StaffPrivacyNoticePdfData
import at.wrk.tafel.admin.backend.common.pdf.PDFService
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import org.apache.commons.io.IOUtils
import org.springframework.stereotype.Service
import org.springframework.util.MimeTypeUtils
import java.time.Clock
import java.time.LocalDate
import java.time.Period
import java.time.format.DateTimeFormatter

/**
 * The Art. 13 GDPR privacy notice for staff (GDPR gap G20, issue #3429) - what users and employees
 * were missing entirely: `UserExportService`/`EmployeeExportService` answer "what do you have on
 * me" (Art. 15), but nothing told them *that* their data is processed, for what purpose and how
 * long, the way [at.wrk.tafel.admin.backend.modules.household.internal.masterdata.HouseholdPdfService.generatePrivacyNoticePdf]
 * already does for customers.
 *
 * Generic and reference-less on purpose, the same shape as that method's own blank counterpart
 * ([at.wrk.tafel.admin.backend.modules.household.internal.masterdata.HouseholdPdfService.generatePrivacyNoticeTemplatePdf]):
 * this is informational only, not a consent form, so it needs no per-person data and is reachable
 * without picking a specific user or employee first - from the user menu for self-service, and from
 * the Mitarbeiter settings screen for an admin to hand it to someone with no account of their own.
 * Not `@Transactional` and not audit-logged for the same reason as that blank counterpart: nothing
 * here is anyone's personal data.
 */
@Service
class StaffPrivacyNoticeService(
    private val pdfService: PDFService,
    private val tafelAdminProperties: TafelAdminProperties,
    private val clock: Clock,
) {

    companion object {
        private const val LOGO_RESOURCE_PATH = "/assets/logo.png"
        private const val PDF_STYLESHEET_PATH = "/pdf-templates/staff-pdf/privacy-notice-document.xsl"
        private val DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
    }

    fun generatePrivacyNoticePdf(): ByteArray {
        val data = StaffPrivacyNoticePdfData(
            logoContentType = MimeTypeUtils.IMAGE_PNG_VALUE,
            logoBytes = IOUtils.toByteArray(javaClass.getResourceAsStream(LOGO_RESOURCE_PATH)),
            issuedAtDate = LocalDate.now(clock).format(DATE_FORMATTER),
            userRetentionText = formatPeriod(tafelAdminProperties.userDeletion.retentionTime),
            employeeRetentionText = formatPeriod(tafelAdminProperties.employeeDeletion.retentionTime),
            auditRetentionDays = tafelAdminProperties.audit.retentionDays.toString(),
        )
        return pdfService.generatePdf(data, PDF_STYLESHEET_PATH)
    }

    /**
     * `userDeletion.retentionTime`/`employeeDeletion.retentionTime` are a [Period], read from
     * config as `7y`/`18m`/`730d`-style values (see [TafelAdminProperties]'s KDoc) rather than a
     * single number, so this renders whichever of years/months/days an operator actually set rather
     * than assuming years alone. Dative plural throughout ("Jahren"/"Monaten"/"Tagen") since both
     * call sites in the template use it after "mehr als"/"nach".
     */
    private fun formatPeriod(period: Period): String {
        val parts = buildList {
            if (period.years != 0) add("${period.years} Jahren")
            if (period.months != 0) add("${period.months} Monaten")
            if (period.days != 0) add("${period.days} Tagen")
        }
        return parts.ifEmpty { listOf("0 Tagen") }.joinToString(" ")
    }
}
