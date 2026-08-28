package at.wrk.tafel.admin.backend.common.auth.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import com.fasterxml.jackson.annotation.JsonRootName

/**
 * The XML payload behind `StaffPrivacyNoticeService`'s Art. 13 notice PDF (GDPR gap G20, issue
 * #3429) - generic, not per-person, the same as `PrivacyNoticePdfData`'s reference-less template
 * counterpart: nothing here is any one staff member's data, so there is nothing to look up.
 */
@JsonRootName("data")
@ExcludeFromTestCoverage
data class StaffPrivacyNoticePdfData(
    val logoContentType: String,
    val logoBytes: ByteArray,
    val issuedAtDate: String,
    val userRetentionText: String,
    val employeeRetentionText: String,
    val auditRetentionDays: String,
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as StaffPrivacyNoticePdfData

        if (logoContentType != other.logoContentType) return false
        if (!logoBytes.contentEquals(other.logoBytes)) return false
        if (issuedAtDate != other.issuedAtDate) return false
        if (userRetentionText != other.userRetentionText) return false
        if (employeeRetentionText != other.employeeRetentionText) return false
        if (auditRetentionDays != other.auditRetentionDays) return false

        return true
    }

    override fun hashCode(): Int {
        var result = logoContentType.hashCode()
        result = 31 * result + logoBytes.contentHashCode()
        result = 31 * result + issuedAtDate.hashCode()
        result = 31 * result + userRetentionText.hashCode()
        result = 31 * result + employeeRetentionText.hashCode()
        result = 31 * result + auditRetentionDays.hashCode()
        return result
    }
}
