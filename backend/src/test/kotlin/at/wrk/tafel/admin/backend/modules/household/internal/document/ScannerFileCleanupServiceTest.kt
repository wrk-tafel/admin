package at.wrk.tafel.admin.backend.modules.household.internal.document

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.attribute.FileTime
import java.time.Duration
import java.time.Instant
import java.time.temporal.ChronoUnit

internal class ScannerFileCleanupServiceTest {

    @TempDir
    private lateinit var tempDir: Path

    private lateinit var properties: TafelAdminProperties

    private lateinit var service: ScannerFileCleanupService

    @BeforeEach
    fun beforeEach() {
        properties = TafelAdminProperties().apply {
            storage.scannerPath = tempDir.toString()
            storage.scannerFileRetention = Duration.ofDays(7)
        }
        service = ScannerFileCleanupService(properties)
    }

    private fun writeFile(fileName: String, ageInDays: Long): Path {
        val file = tempDir.resolve(fileName)
        Files.writeString(file, "content")
        Files.setLastModifiedTime(file, FileTime.from(Instant.now().minus(ageInDays, ChronoUnit.DAYS)))
        return file
    }

    @Test
    fun `deletes a file older than the configured retention`() {
        val expiredFile = writeFile("scan1.pdf", ageInDays = 8)

        service.cleanupExpiredScannerFiles()

        assertThat(expiredFile).doesNotExist()
    }

    @Test
    fun `keeps a file younger than the configured retention`() {
        val recentFile = writeFile("scan1.pdf", ageInDays = 6)

        service.cleanupExpiredScannerFiles()

        assertThat(recentFile).exists()
    }

    @Test
    fun `keeps every file when retention is zero or negative`() {
        properties.storage.scannerFileRetention = Duration.ZERO
        val oldFile = writeFile("scan1.pdf", ageInDays = 30)

        service.cleanupExpiredScannerFiles()

        assertThat(oldFile).exists()
    }

    @Test
    fun `is a no-op when no scanner path is configured`() {
        properties.storage.scannerPath = null

        service.cleanupExpiredScannerFiles()
    }

    @Test
    fun `is a no-op when the scanner directory doesn't exist`() {
        properties.storage.scannerPath = tempDir.resolve("does-not-exist").toString()

        service.cleanupExpiredScannerFiles()
    }
}
