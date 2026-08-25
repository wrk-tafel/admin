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

        return true
    }

    override fun hashCode(): Int {
        var result = logoContentType.hashCode()
        result = 31 * result + logoBytes.contentHashCode()
        result = 31 * result + exportedAt.hashCode()
        result = 31 * result + masterData.hashCode()
        result = 31 * result + permissions.hashCode()
        return result
    }
}
