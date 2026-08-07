package at.wrk.tafel.admin.backend.modules.household.internal.document

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminStorageProperties
import at.wrk.tafel.admin.backend.modules.base.exception.BusinessRuleException
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.io.TempDir
import java.nio.file.Files
import java.nio.file.Path

internal class ScannerFileServiceTest {

    @TempDir
    private lateinit var tempDir: Path

    private fun serviceWithScannerPath(path: String?, enabled: Boolean = true) = ScannerFileService(
        TafelAdminProperties(storage = TafelAdminStorageProperties(scannerPath = path, scannerEnabled = enabled)),
    )

    @Test
    fun `listFiles returns empty list when scannerPath is not configured`() {
        val service = serviceWithScannerPath(null)

        assertThat(service.listFiles()).isEmpty()
    }

    @Test
    fun `isEnabled is true only when a scanner path is configured and the feature is switched on`() {
        assertThat(serviceWithScannerPath(tempDir.toString()).isEnabled()).isTrue()
        assertThat(serviceWithScannerPath(tempDir.toString(), enabled = false).isEnabled()).isFalse()
        assertThat(serviceWithScannerPath(null).isEnabled()).isFalse()
        assertThat(serviceWithScannerPath(" ").isEnabled()).isFalse()
    }

    /**
     * A missing share must not read as "feature removed" - it stays enabled so the picker keeps
     * showing, just with nothing in it (see `ScannerFileService.isEnabled`).
     */
    @Test
    fun `isEnabled stays true when the configured directory doesn't exist`() {
        assertThat(serviceWithScannerPath(tempDir.resolve("does-not-exist").toString()).isEnabled()).isTrue()
    }

    @Test
    fun `listFiles returns empty list when the feature is switched off despite a configured path`() {
        Files.writeString(tempDir.resolve("scan1.pdf"), "content1")
        val service = serviceWithScannerPath(tempDir.toString(), enabled = false)

        assertThat(service.listFiles()).isEmpty()
    }

    @Test
    fun `read is rejected when the feature is switched off despite a configured path`() {
        Files.writeString(tempDir.resolve("scan1.pdf"), "content1")
        val service = serviceWithScannerPath(tempDir.toString(), enabled = false)

        assertThrows<NotFoundException> { service.read("scan1.pdf") }
    }

    @Test
    fun `delete is rejected when the feature is switched off despite a configured path`() {
        val file = tempDir.resolve("scan1.pdf")
        Files.writeString(file, "content1")
        val service = serviceWithScannerPath(tempDir.toString(), enabled = false)

        assertThrows<NotFoundException> { service.delete("scan1.pdf") }
        assertThat(Files.exists(file)).isTrue()
    }

    @Test
    fun `listFiles returns empty list when the directory doesn't exist`() {
        val service = serviceWithScannerPath(tempDir.resolve("does-not-exist").toString())

        assertThat(service.listFiles()).isEmpty()
    }

    @Test
    fun `listFiles lists only supported file extensions`() {
        Files.writeString(tempDir.resolve("scan1.pdf"), "content1")
        Files.writeString(tempDir.resolve("scan2.PNG"), "content2")
        Files.writeString(tempDir.resolve("readme.txt"), "not-a-document")
        val service = serviceWithScannerPath(tempDir.toString())

        val files = service.listFiles().map { it.fileName }

        assertThat(files).containsExactlyInAnyOrder("scan1.pdf", "scan2.PNG")
    }

    @Test
    fun `listFiles numbers entries by recency, newest first`() {
        val older = tempDir.resolve("scan1.pdf")
        Files.writeString(older, "content1")
        Thread.sleep(1100) // ensure a distinct mtime even on filesystems with 1s resolution
        val newer = tempDir.resolve("scan2.pdf")
        Files.writeString(newer, "content2")
        val service = serviceWithScannerPath(tempDir.toString())

        val files = service.listFiles()

        assertThat(files[0].fileName).isEqualTo("scan2.pdf")
        assertThat(files[0].displayName).isEqualTo("Scan 1")
        assertThat(files[1].fileName).isEqualTo("scan1.pdf")
        assertThat(files[1].displayName).isEqualTo("Scan 2")
    }

    @Test
    fun `read returns the file's bytes`() {
        Files.writeString(tempDir.resolve("scan1.pdf"), "content1")
        val service = serviceWithScannerPath(tempDir.toString())

        assertThat(service.read("scan1.pdf")).isEqualTo("content1".toByteArray())
    }

    @Test
    fun `read rejects path traversal`() {
        val service = serviceWithScannerPath(tempDir.toString())

        assertThrows<BusinessRuleException> {
            service.read("../outside.pdf")
        }
    }

    @Test
    fun `read of a missing file throws NotFoundException`() {
        val service = serviceWithScannerPath(tempDir.toString())

        assertThrows<NotFoundException> {
            service.read("missing.pdf")
        }
    }

    @Test
    fun `delete removes the file`() {
        val file = tempDir.resolve("scan1.pdf")
        Files.writeString(file, "content1")
        val service = serviceWithScannerPath(tempDir.toString())

        service.delete("scan1.pdf")

        assertThat(file).doesNotExist()
    }

    @Test
    fun `resolveContentType maps known extensions`() {
        val service = serviceWithScannerPath(tempDir.toString())

        assertThat(service.resolveContentType("a.pdf")).isEqualTo("application/pdf")
        assertThat(service.resolveContentType("a.jpg")).isEqualTo("image/jpeg")
        assertThat(service.resolveContentType("a.jpeg")).isEqualTo("image/jpeg")
        assertThat(service.resolveContentType("a.png")).isEqualTo("image/png")
    }

    @Test
    fun `resolveContentType rejects unsupported extensions`() {
        val service = serviceWithScannerPath(tempDir.toString())

        assertThrows<BusinessRuleException> {
            service.resolveContentType("a.exe")
        }
    }
}
