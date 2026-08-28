package at.wrk.tafel.admin.backend.common.auth.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import com.fasterxml.jackson.annotation.JsonRootName

/**
 * One row of `UserExportService`'s data export, feeding the PDF file (`datenexport.pdf`).
 */
@ExcludeFromTestCoverage
data class UserExportField(
    val label: String,
    val value: String,
)

@ExcludeFromTestCoverage
data class UserExportPermissionRow(
    val category: String,
    val title: String,
    val grantedAt: String,
    val grantedBy: String,
)

@ExcludeFromTestCoverage
data class UserExportPushDeviceRow(
    val label: String,
    val endpoint: String,
    val userAgent: String,
    val registeredAt: String,
)

@ExcludeFromTestCoverage
data class UserExportPushTypePreferenceRow(
    val type: String,
    val enabled: String,
)

@ExcludeFromTestCoverage
data class UserExportLoginRow(
    val occurredAt: String,
)

/**
 * The GDPR Art. 20 machine-readable counterpart to [UserExportPdfData] - the same rows behind
 * `UserExportService`'s `daten.json`, serialised as-is via `tools.jackson.databind.json.JsonMapper`
 * rather than through the XSL-FO pipeline. No logo: that field only exists for the PDF's letterhead.
 */
@ExcludeFromTestCoverage
data class UserExportJsonData(
    val exportedAt: String,
    val masterData: List<UserExportField>,
    val permissions: List<UserExportPermissionRow>,
    val pushDevices: List<UserExportPushDeviceRow>,
    val pushTypePreferences: List<UserExportPushTypePreferenceRow>,
    val loginAttempt: List<UserExportField>,
    val logins: List<UserExportLoginRow>,
)

/**
 * The XML payload behind `UserExportService`'s data-export PDF - every field pre-formatted to a
 * display string in Kotlin, same as `HouseholdExportPdfData`, so the XSL stylesheet only ever does
 * `xsl:value-of`.
 */
@JsonRootName("data")
@ExcludeFromTestCoverage
data class UserExportPdfData(
    val logoContentType: String,
    val logoBytes: ByteArray,
    val exportedAt: String,
    val masterData: List<UserExportField>,
    val permissions: List<UserExportPermissionRow>,
    val pushDevices: List<UserExportPushDeviceRow>,
    val pushTypePreferences: List<UserExportPushTypePreferenceRow>,
    val loginAttempt: List<UserExportField>,
    val logins: List<UserExportLoginRow>,
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as UserExportPdfData

        if (logoContentType != other.logoContentType) return false
        if (!logoBytes.contentEquals(other.logoBytes)) return false
        if (exportedAt != other.exportedAt) return false
        if (masterData != other.masterData) return false
        if (permissions != other.permissions) return false
        if (pushDevices != other.pushDevices) return false
        if (pushTypePreferences != other.pushTypePreferences) return false
        if (loginAttempt != other.loginAttempt) return false
        if (logins != other.logins) return false

        return true
    }

    override fun hashCode(): Int {
        var result = logoContentType.hashCode()
        result = 31 * result + logoBytes.contentHashCode()
        result = 31 * result + exportedAt.hashCode()
        result = 31 * result + masterData.hashCode()
        result = 31 * result + permissions.hashCode()
        result = 31 * result + pushDevices.hashCode()
        result = 31 * result + pushTypePreferences.hashCode()
        result = 31 * result + loginAttempt.hashCode()
        result = 31 * result + logins.hashCode()
        return result
    }
}
