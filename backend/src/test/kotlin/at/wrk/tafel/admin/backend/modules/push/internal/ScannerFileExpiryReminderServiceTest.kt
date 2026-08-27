package at.wrk.tafel.admin.backend.modules.push.internal

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.model.push.PushNotificationType
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.junit.jupiter.api.io.TempDir
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.attribute.FileTime
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.ZoneOffset
import java.time.temporal.ChronoUnit

@ExtendWith(MockKExtension::class)
internal class ScannerFileExpiryReminderServiceTest {

    @TempDir
    private lateinit var tempDir: Path

    @RelaxedMockK
    private lateinit var pushBroadcastService: PushBroadcastService

    private lateinit var properties: TafelAdminProperties

    private lateinit var service: ScannerFileExpiryReminderService

    // Retention 7d, warning 1d - so files older than 6d (but not yet deleted, i.e. younger than 7d)
    // are the ones in the warning window.
    private val clock = Clock.fixed(Instant.parse("2024-03-05T09:00:00Z"), ZoneOffset.UTC)

    @BeforeEach
    fun beforeEach() {
        properties = TafelAdminProperties().apply {
            storage.scannerPath = tempDir.toString()
            storage.scannerFileRetention = Duration.ofDays(7)
            storage.scannerFileRetentionWarning = Duration.ofDays(1)
        }
        service = ScannerFileExpiryReminderService(properties, pushBroadcastService, clock)
    }

    private fun writeFile(fileName: String, ageInHours: Long): Path {
        val file = tempDir.resolve(fileName)
        Files.writeString(file, "content")
        Files.setLastModifiedTime(file, FileTime.from(Instant.now(clock).minus(ageInHours, ChronoUnit.HOURS)))
        return file
    }

    @Test
    fun `warns about a file inside the warning window`() {
        // Warning window starts at 6d old (retention 7d minus warning 1d) - an hour past that is
        // unambiguously inside it.
        writeFile("scan1.pdf", ageInHours = 6 * 24 + 1)

        service.remindAboutExpiringScannerFiles()

        verify {
            pushBroadcastService.broadcast(
                type = PushNotificationType.SCANNER_FILES_EXPIRING,
                title = any(),
                body = match { it.contains("1 gescannte") },
            )
        }
    }

    @Test
    fun `stays quiet about a file well within retention`() {
        writeFile("scan1.pdf", ageInHours = 3 * 24)

        service.remindAboutExpiringScannerFiles()

        verify(exactly = 0) { pushBroadcastService.broadcast(any(), any(), any()) }
    }

    @Test
    fun `counts every file already in the warning window, deleted or not`() {
        writeFile("scan1.pdf", ageInHours = 6 * 24 + 1)
        writeFile("scan2.pdf", ageInHours = 8 * 24)

        service.remindAboutExpiringScannerFiles()

        verify {
            pushBroadcastService.broadcast(
                type = PushNotificationType.SCANNER_FILES_EXPIRING,
                title = any(),
                body = match { it.contains("2 gescannte") },
            )
        }
    }

    @Test
    fun `is switched off when retention is zero or negative`() {
        properties.storage.scannerFileRetention = Duration.ZERO
        writeFile("scan1.pdf", ageInHours = 30 * 24)

        service.remindAboutExpiringScannerFiles()

        verify(exactly = 0) { pushBroadcastService.broadcast(any(), any(), any()) }
    }

    @Test
    fun `is a no-op when no scanner path is configured`() {
        properties.storage.scannerPath = null

        service.remindAboutExpiringScannerFiles()

        verify(exactly = 0) { pushBroadcastService.broadcast(any(), any(), any()) }
    }

    @Test
    fun `is a no-op when the scanner directory doesn't exist`() {
        properties.storage.scannerPath = tempDir.resolve("does-not-exist").toString()

        service.remindAboutExpiringScannerFiles()

        verify(exactly = 0) { pushBroadcastService.broadcast(any(), any(), any()) }
    }
}
