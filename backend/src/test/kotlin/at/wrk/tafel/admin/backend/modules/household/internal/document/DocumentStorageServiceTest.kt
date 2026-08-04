package at.wrk.tafel.admin.backend.modules.household.internal.document

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminStorageProperties
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.nio.file.Files
import java.nio.file.Path

internal class DocumentStorageServiceTest {

    @TempDir
    private lateinit var tempDir: Path

    private val service by lazy {
        DocumentStorageService(TafelAdminProperties(storage = TafelAdminStorageProperties(documentsPath = tempDir.toString())))
    }

    @Test
    fun `store writes the file under a per-household directory and returns its path`() {
        val storagePath = service.store(100L, "proof.pdf", "test-content".toByteArray())

        val storedFile = Path.of(storagePath)
        assertThat(storedFile).exists()
        assertThat(storedFile.parent).isEqualTo(tempDir.resolve("100"))
        assertThat(storedFile.fileName.toString()).endsWith("_proof.pdf")
        assertThat(Files.readAllBytes(storedFile)).isEqualTo("test-content".toByteArray())
    }

    @Test
    fun `store sanitizes path segments in the original filename`() {
        val storagePath = service.store(100L, "../../etc/passwd", "test-content".toByteArray())

        val storedFile = Path.of(storagePath)
        assertThat(storedFile.parent).isEqualTo(tempDir.resolve("100"))
        assertThat(storedFile.fileName.toString()).endsWith("_passwd")
    }

    @Test
    fun `read returns the stored bytes`() {
        val storagePath = service.store(100L, "proof.pdf", "test-content".toByteArray())

        val bytes = service.read(storagePath)

        assertThat(bytes).isEqualTo("test-content".toByteArray())
    }

    @Test
    fun `delete removes the file`() {
        val storagePath = service.store(100L, "proof.pdf", "test-content".toByteArray())
        assertThat(Path.of(storagePath)).exists()

        service.delete(storagePath)

        assertThat(Path.of(storagePath)).doesNotExist()
    }

    @Test
    fun `delete is a no-op when the file doesn't exist`() {
        service.delete(tempDir.resolve("does-not-exist.pdf").toString())
    }
}
