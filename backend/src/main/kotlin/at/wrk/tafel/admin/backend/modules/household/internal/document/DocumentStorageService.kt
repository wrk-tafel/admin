package at.wrk.tafel.admin.backend.modules.household.internal.document

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import org.springframework.stereotype.Service
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.util.UUID

/**
 * Reads/writes the actual document files under [TafelAdminProperties.storage]'s `documentsPath`.
 * Kept separate from [HouseholdDocumentService] so `HouseholdService.deleteHouseholdByHouseholdId`
 * can clean up files on disk (JPA cascade only removes the DB rows) without depending on the
 * document business-logic service, and so storage can be mocked independently in tests.
 */
@Service
class DocumentStorageService(
    private val tafelAdminProperties: TafelAdminProperties,
) {

    fun store(householdId: Long, originalFileName: String, bytes: ByteArray): String {
        val householdDir = Paths.get(tafelAdminProperties.storage.documentsPath, householdId.toString())
        Files.createDirectories(householdDir)

        // Strip any path segments from the original filename (untrusted, browser/NAS supplied) so
        // it can't escape householdDir.
        val sanitizedFileName = Paths.get(originalFileName).fileName.toString()
        val storedFileName = "${UUID.randomUUID()}_$sanitizedFileName"

        val path = householdDir.resolve(storedFileName)
        Files.write(path, bytes)
        return path.toAbsolutePath().toString()
    }

    fun read(storagePath: String): ByteArray = Files.readAllBytes(Path.of(storagePath))

    fun delete(storagePath: String) {
        Files.deleteIfExists(Path.of(storagePath))
    }
}
