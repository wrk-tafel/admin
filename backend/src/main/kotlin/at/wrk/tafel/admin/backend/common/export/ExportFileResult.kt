package at.wrk.tafel.admin.backend.common.export

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage

/**
 * The (filename, bytes) shape every per-area GDPR export already returns internally
 * (`HouseholdExportFileResult`/`UserExportFileResult`/`EmployeeExportFileResult`) - the common type
 * a cross-module facade maps to, since Spring Modulith never exposes an `.internal` type through a
 * named interface, so those three result types can't cross a module boundary as-is.
 */
@ExcludeFromTestCoverage
data class ExportFileResult(
    val filename: String,
    val bytes: ByteArray,
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as ExportFileResult

        if (filename != other.filename) return false
        return bytes.contentEquals(other.bytes)
    }

    override fun hashCode(): Int {
        var result = filename.hashCode()
        result = 31 * result + bytes.contentHashCode()
        return result
    }
}
