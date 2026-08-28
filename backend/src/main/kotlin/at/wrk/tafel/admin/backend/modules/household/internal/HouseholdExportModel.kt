package at.wrk.tafel.admin.backend.modules.household.internal

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import com.fasterxml.jackson.annotation.JsonRootName

/**
 * One row of [HouseholdExportService]'s data export, feeding the PDF file (`datenexport.pdf`) inside
 * the export ZIP.
 */
@ExcludeFromTestCoverage
data class HouseholdExportField(
    val label: String,
    val value: String,
)

@ExcludeFromTestCoverage
data class HouseholdExportPersonRow(
    val name: String,
    val mainPerson: String,
    val birthDate: String,
    val gender: String,
    val country: String,
    val employer: String,
    val income: String,
    val incomeDue: String,
    val familyAllowance: String,
    val excludeFromHousehold: String,
    val updatedBy: String,
)

@ExcludeFromTestCoverage
data class HouseholdExportNoteRow(
    val timestamp: String,
    val author: String,
    val note: String,
    val updatedBy: String,
)

@ExcludeFromTestCoverage
data class HouseholdExportAttendanceRow(
    val startedAt: String,
    val endedAt: String,
    val ticketNumber: Int,
    val processed: String,
    val costContributionPaid: String,
)

@ExcludeFromTestCoverage
data class HouseholdExportDocumentRow(
    val fileName: String,
    val documentType: String,
    val uploadedAt: String,
    val person: String,
    val uploadedBy: String,
)

/**
 * The GDPR Art. 20 machine-readable counterpart to [HouseholdExportPdfData] - the same rows behind
 * [HouseholdExportService]'s `daten.json`, serialised as-is via [tools.jackson.databind.json.JsonMapper]
 * rather than through the XSL-FO pipeline. No logo: that field only exists for the PDF's letterhead.
 */
@ExcludeFromTestCoverage
data class HouseholdExportJsonData(
    val householdId: Long,
    val exportedAt: String,
    val masterData: List<HouseholdExportField>,
    val persons: List<HouseholdExportPersonRow>,
    val notes: List<HouseholdExportNoteRow>,
    val attendances: List<HouseholdExportAttendanceRow>,
    val documents: List<HouseholdExportDocumentRow>,
)

/**
 * The XML payload behind [HouseholdExportService]'s `datenexport.pdf` - every field pre-formatted to
 * a display string in Kotlin, same as [at.wrk.tafel.admin.backend.modules.household.internal.masterdata.PdfData],
 * so the XSL stylesheet only ever does `xsl:value-of`.
 */
@JsonRootName("data")
@ExcludeFromTestCoverage
data class HouseholdExportPdfData(
    val logoContentType: String,
    val logoBytes: ByteArray,
    val householdId: Long,
    val exportedAt: String,
    val masterData: List<HouseholdExportField>,
    val persons: List<HouseholdExportPersonRow>,
    val notes: List<HouseholdExportNoteRow>,
    val attendances: List<HouseholdExportAttendanceRow>,
    val documents: List<HouseholdExportDocumentRow>,
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as HouseholdExportPdfData

        if (logoContentType != other.logoContentType) return false
        if (!logoBytes.contentEquals(other.logoBytes)) return false
        if (householdId != other.householdId) return false
        if (exportedAt != other.exportedAt) return false
        if (masterData != other.masterData) return false
        if (persons != other.persons) return false
        if (notes != other.notes) return false
        if (attendances != other.attendances) return false
        if (documents != other.documents) return false

        return true
    }

    override fun hashCode(): Int {
        var result = logoContentType.hashCode()
        result = 31 * result + logoBytes.contentHashCode()
        result = 31 * result + householdId.hashCode()
        result = 31 * result + exportedAt.hashCode()
        result = 31 * result + masterData.hashCode()
        result = 31 * result + persons.hashCode()
        result = 31 * result + notes.hashCode()
        result = 31 * result + attendances.hashCode()
        result = 31 * result + documents.hashCode()
        return result
    }
}
