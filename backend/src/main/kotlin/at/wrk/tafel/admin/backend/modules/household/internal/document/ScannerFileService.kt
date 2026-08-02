package at.wrk.tafel.admin.backend.modules.household.internal.document

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.modules.base.exception.BusinessRuleException
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import org.springframework.stereotype.Service
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.time.LocalDateTime
import java.time.ZoneId

/**
 * Reads the shared "scanner" inbox folder (a mount point for a NAS share a physical scanner
 * writes to, [TafelAdminProperties.storage]'s `scannerPath`) so staff can pick an already-scanned
 * file instead of using the browser's file picker. `scannerPath` is optional - not every
 * environment has the NAS share mounted - so every method degrades gracefully when it's unset.
 */
@Service
class ScannerFileService(
    private val tafelAdminProperties: TafelAdminProperties,
) {

    fun listFiles(): List<ScannerFileItem> {
        val scannerPath = tafelAdminProperties.storage.scannerPath ?: return emptyList()
        val scannerDir = Paths.get(scannerPath)
        if (!Files.isDirectory(scannerDir)) {
            return emptyList()
        }

        val files = Files.list(scannerDir).use { stream ->
            stream
                .filter { Files.isRegularFile(it) && isSupportedExtension(it.fileName.toString()) }
                .map { toScannerFileItem(it) }
                .toList()
        }
        return files.sortedByDescending { it.modifiedAt }
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
        val scannerPath = tafelAdminProperties.storage.scannerPath
            ?: throw NotFoundException("Datei $fileName nicht vorhanden!")
        val scannerDir = Paths.get(scannerPath).toAbsolutePath().normalize()
        val resolved = scannerDir.resolve(fileName).normalize()
        if (resolved.parent != scannerDir) {
            throw BusinessRuleException("Ungültiger Dateiname!")
        }
        if (!Files.isRegularFile(resolved)) {
            throw NotFoundException("Datei $fileName nicht vorhanden!")
        }
        return resolved
    }

    private fun toScannerFileItem(path: Path): ScannerFileItem = ScannerFileItem(
        fileName = path.fileName.toString(),
        sizeBytes = Files.size(path),
        modifiedAt = LocalDateTime.ofInstant(Files.getLastModifiedTime(path).toInstant(), ZoneId.systemDefault()),
    )

    private fun isSupportedExtension(fileName: String): Boolean = CONTENT_TYPES_BY_EXTENSION.containsKey(extensionOf(fileName))

    private fun extensionOf(fileName: String): String = fileName.substringAfterLast('.', missingDelimiterValue = "").lowercase()

    companion object {
        private val CONTENT_TYPES_BY_EXTENSION = mapOf(
            "pdf" to "application/pdf",
            "jpg" to "image/jpeg",
            "jpeg" to "image/jpeg",
            "png" to "image/png",
        )
    }
}
