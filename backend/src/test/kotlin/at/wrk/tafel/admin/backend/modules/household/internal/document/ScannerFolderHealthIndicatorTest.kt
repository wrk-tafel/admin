package at.wrk.tafel.admin.backend.modules.household.internal.document

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminStorageProperties
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import org.springframework.boot.health.contributor.Status
import java.nio.file.Files
import java.nio.file.Path

internal class ScannerFolderHealthIndicatorTest {

    @TempDir
    private lateinit var tempDir: Path

    private fun indicatorWithScannerPath(path: String?) = ScannerFolderHealthIndicator(
        TafelAdminProperties(storage = TafelAdminStorageProperties(scannerPath = path)),
    )

    @Test
    fun `reports up with configured=false when scannerPath is not set`() {
        val indicator = indicatorWithScannerPath(null)

        val health = indicator.health()

        assertThat(health.status).isEqualTo(Status.UP)
        assertThat(health.details).containsEntry("configured", false)
    }

    @Test
    fun `reports down when the configured path is not a directory - eg a dropped mount`() {
        val indicator = indicatorWithScannerPath(tempDir.resolve("does-not-exist").toString())

        val health = indicator.health()

        assertThat(health.status).isEqualTo(Status.DOWN)
        assertThat(health.details).containsEntry("configured", true)
        assertThat(health.details["reason"]).asString().contains("not a directory")
    }

    @Test
    fun `reports up with the file count when the directory is listable`() {
        Files.writeString(tempDir.resolve("scan1.pdf"), "content1")
        val indicator = indicatorWithScannerPath(tempDir.toString())

        val health = indicator.health()

        assertThat(health.status).isEqualTo(Status.UP)
        assertThat(health.details).containsEntry("configured", true)
        assertThat(health.details).containsEntry("fileCount", 1L)
    }
}
