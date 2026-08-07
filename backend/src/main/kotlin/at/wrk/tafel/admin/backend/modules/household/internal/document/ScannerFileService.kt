package at.wrk.tafel.admin.backend.modules.household.internal.document

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.modules.base.exception.BusinessRuleException
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import org.springframework.http.MediaType
import org.springframework.stereotype.Service
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.time.LocalDateTime
import java.time.ZoneId

/**
 * Reads the shared "scanner" inbox folder (a mount point for a NAS share a physical scanner
 * writes to, [TafelAdminProperties.storage]'s `scannerPath`) so staff can pick an already-scanned
 * file instead of using the browser's file picker. The folder is optional - not every environment
 * has the NAS share mounted, and `scannerEnabled` can switch the feature off even where it is - so
 * every method degrades gracefully when [isEnabled] is false.
 */
@Service
class ScannerFileService(
    private val tafelAdminProperties: TafelAdminProperties,
) {

    /**
     * Whether the scanner folder is available at all - see
     * [at.wrk.tafel.admin.backend.config.properties.TafelAdminStorageProperties.scannerFolderAvailable],
     * which the frontend is told about separately through `ConfigController`.
     */
    fun isEnabled(): Boolean = tafelAdminProperties.storage.scannerFolderAvailable

    fun listFiles(): List<ScannerFileItem> {
        if (!isEnabled()) {
            return emptyList()
        }
        val scannerPath = tafelAdminProperties.storage.scannerPath ?: return emptyList()
        val scannerDir = Paths.get(scannerPath)
        if (!Files.isDirectory(scannerDir)) {
            return emptyList()
        }

        val sortedPaths = Files.list(scannerDir).use { stream ->
            stream
                .filter { Files.isRegularFile(it) && isSupportedExtension(it.fileName.toString()) }
                .toList()
        }.sortedByDescending { Files.getLastModifiedTime(it) }

        // "Scan 1" is the newest file (top of the list) - matches reading order, so the numbering
        // doesn't visually contradict where each entry sits.
        return sortedPaths.mapIndexed { index, path -> toScannerFileItem(path, displayName = "Scan ${index + 1}") }
    }

    fun read(fileName: String): ByteArray = Files.readAllBytes(resolveSafely(fileName))

    fun delete(fileName: String) {
        Files.deleteIfExists(resolveSafely(fileName))
    }

    fun resolveContentType(fileName: String): String = CONTENT_TYPES_BY_EXTENSION[extensionOf(fileName)]
        ?: throw BusinessRuleException("Dateityp wird nicht unterstützt!")

    /**
     * Resolves an untrusted, client-supplied filename against the scanner directory and rejects
     * anything that would escape it (path traversal via `..`, absolute paths, subdirectories) -
     * the scanner folder is only ever listed/read/deleted as a flat directory.
     */
    private fun resolveSafely(fileName: String): Path {
        val scannerPath = tafelAdminProperties.storage.scannerPath?.takeIf { isEnabled() }
            ?: throw NotFoundException("Datei $fileName nicht vorhanden!")
        val scannerDir = Paths.get(scannerPath).toAbsolutePath().normalize()
        val resolved = scannerDir.resolve(fileName).normalize()
        // `startsWith` is the check static analysis (correctly) looks for to prove `resolved` can't
        // have escaped `scannerDir` - `resolved.parent != scannerDir` alone is equally correct
        // (and additionally rejects subdirectories, kept for the flat-directory business rule) but
        // isn't recognized as a path-traversal sanitizer.
        if (!resolved.startsWith(scannerDir) || resolved.parent != scannerDir) {
            throw BusinessRuleException("Ungültiger Dateiname!")
        }
        if (!Files.isRegularFile(resolved)) {
            throw NotFoundException("Datei $fileName nicht vorhanden!")
        }
        return resolved
    }

    private fun toScannerFileItem(path: Path, displayName: String): ScannerFileItem = ScannerFileItem(
        fileName = path.fileName.toString(),
        displayName = displayName,
        sizeBytes = Files.size(path),
        modifiedAt = LocalDateTime.ofInstant(Files.getLastModifiedTime(path).toInstant(), ZoneId.systemDefault()),
    )

    private fun isSupportedExtension(fileName: String): Boolean = CONTENT_TYPES_BY_EXTENSION.containsKey(extensionOf(fileName))

    private fun extensionOf(fileName: String): String = fileName.substringAfterLast('.', missingDelimiterValue = "").lowercase()

    companion object {
        private val CONTENT_TYPES_BY_EXTENSION = mapOf(
            "pdf" to MediaType.APPLICATION_PDF_VALUE,
            "jpg" to MediaType.IMAGE_JPEG_VALUE,
            "jpeg" to MediaType.IMAGE_JPEG_VALUE,
            "png" to MediaType.IMAGE_PNG_VALUE,
        )
    }
}
