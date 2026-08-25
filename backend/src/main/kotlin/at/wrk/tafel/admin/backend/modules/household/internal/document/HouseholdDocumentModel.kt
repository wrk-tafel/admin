package at.wrk.tafel.admin.backend.modules.household.internal.document

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import jakarta.validation.constraints.NotBlank
import java.time.LocalDateTime

/**
 * API-facing counterpart of [at.wrk.tafel.admin.backend.database.model.household.DocumentType] -
 * controllers must not depend on `database.model` types directly (see `ProjectSpecificRulesTest`),
 * so this mirrors it structurally; [HouseholdDocumentService] converts between the two, same as
 * `PersonGender`/`Gender` for households/persons.
 */
@ExcludeFromTestCoverage
enum class DocumentType {
    PROOF_OF_INCOME,
    ID,
    PRIVACY_NOTICE,
    OTHER,
}

@ExcludeFromTestCoverage
data class DocumentItem(
    val id: Long,
    val documentType: DocumentType,
    val fileName: String,
    val uploadedAt: LocalDateTime,
    val uploadedBy: String? = null,
    val personId: Long? = null,
)

@ExcludeFromTestCoverage
data class HouseholdDocumentListResponse(
    val items: List<DocumentItem>,
)

@ExcludeFromTestCoverage
data class DocumentFileResult(
    val fileName: String,
    val contentType: String,
    val bytes: ByteArray,
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as DocumentFileResult

        if (fileName != other.fileName) return false
        if (contentType != other.contentType) return false
        return bytes.contentEquals(other.bytes)
    }

    override fun hashCode(): Int {
        var result = fileName.hashCode()
        result = 31 * result + contentType.hashCode()
        result = 31 * result + bytes.contentHashCode()
        return result
    }
}

@ExcludeFromTestCoverage
data class ScannerFileItem(
    val fileName: String,
    /**
     * Position-based label ("Scan 1", "Scan 2", ...), computed server-side purely for display -
     * scanner-generated filenames are usually near-identical (e.g. sequential counters or a
     * timestamp), so showing the raw filename as the primary label doesn't help staff tell
     * multiple files apart. The physical file itself is never renamed - see [ScannerFileService].
     */
    val displayName: String,
    val sizeBytes: Long,
    val modifiedAt: LocalDateTime,
)

@ExcludeFromTestCoverage
data class ScannerFileListResponse(
    val items: List<ScannerFileItem>,
)

@ExcludeFromTestCoverage
data class ImportScannerDocumentRequest(
    @field:NotBlank
    val fileName: String,
    val documentType: DocumentType,
    val personId: Long? = null,
)
