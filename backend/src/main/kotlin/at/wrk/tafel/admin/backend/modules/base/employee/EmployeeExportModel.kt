package at.wrk.tafel.admin.backend.modules.base.employee

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import com.fasterxml.jackson.annotation.JsonRootName

/**
 * One row of `EmployeeExportService`'s data export - same shape as `UserExportField`, kept separate
 * since it feeds a different PDF template.
 */
@ExcludeFromTestCoverage
data class EmployeeExportField(
    val label: String,
    val value: String,
)

/**
 * The XML payload behind `EmployeeExportService`'s data-export PDF - every field pre-formatted to a
 * display string in Kotlin, same convention as `UserExportPdfData`/`HouseholdExportPdfData`, so the
 * XSL stylesheet only ever does `xsl:value-of`. No permissions section: an employee with no linked
 * user account holds none.
 */
@JsonRootName("data")
@ExcludeFromTestCoverage
data class EmployeeExportPdfData(
    val logoContentType: String,
    val logoBytes: ByteArray,
    val exportedAt: String,
    val masterData: List<EmployeeExportField>,
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as EmployeeExportPdfData

        if (logoContentType != other.logoContentType) return false
        if (!logoBytes.contentEquals(other.logoBytes)) return false
        if (exportedAt != other.exportedAt) return false
        if (masterData != other.masterData) return false

        return true
    }

    override fun hashCode(): Int {
        var result = logoContentType.hashCode()
        result = 31 * result + logoBytes.contentHashCode()
        result = 31 * result + exportedAt.hashCode()
        result = 31 * result + masterData.hashCode()
        return result
    }
}
