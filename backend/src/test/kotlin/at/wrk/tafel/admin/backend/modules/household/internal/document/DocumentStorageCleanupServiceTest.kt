package at.wrk.tafel.admin.backend.modules.household.internal.document

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminStorageProperties
import at.wrk.tafel.admin.backend.database.model.household.DocumentRepository
import io.mockk.every
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.junit.jupiter.api.io.TempDir
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.attribute.FileTime
import java.time.Instant
import java.time.temporal.ChronoUnit

@ExtendWith(MockKExtension::class)
internal class DocumentStorageCleanupServiceTest {

    @TempDir
    private lateinit var tempDir: Path

    @RelaxedMockK
    private lateinit var documentRepository: DocumentRepository

    private lateinit var service: DocumentStorageCleanupService

    @BeforeEach
    fun beforeEach() {
        service = DocumentStorageCleanupService(
            documentRepository = documentRepository,
            tafelAdminProperties = TafelAdminProperties(storage = TafelAdminStorageProperties(documentsPath = tempDir.toString())),
        )
    }

    private fun writeFile(relativePath: String, ageInHours: Long = 2): Path {
        val file = tempDir.resolve(relativePath)
        Files.createDirectories(file.parent)
        Files.writeString(file, "content")
        Files.setLastModifiedTime(file, FileTime.from(Instant.now().minus(ageInHours, ChronoUnit.HOURS)))
        return file
    }

    @Test
    fun `deletes an old file that is no longer referenced in the DB`() {
        val orphanedFile = writeFile("100/uuid_proof.pdf")
        every { documentRepository.findAllStoragePaths() } returns emptyList()

        service.cleanupOrphanedFiles()

        assertThat(orphanedFile).doesNotExist()
    }

    @Test
    fun `keeps a file still referenced in the DB`() {
        val referencedFile = writeFile("100/uuid_proof.pdf")
        every { documentRepository.findAllStoragePaths() } returns listOf(referencedFile.toAbsolutePath().toString())

        service.cleanupOrphanedFiles()

        assertThat(referencedFile).exists()
    }

    @Test
    fun `keeps an unreferenced file that was written too recently`() {
        val recentFile = writeFile("100/uuid_proof.pdf", ageInHours = 0)
        every { documentRepository.findAllStoragePaths() } returns emptyList()

        service.cleanupOrphanedFiles()

        assertThat(recentFile).exists()
    }

    @Test
    fun `is a no-op when the documents directory doesn't exist`() {
        service = DocumentStorageCleanupService(
            documentRepository = documentRepository,
            tafelAdminProperties = TafelAdminProperties(
                storage = TafelAdminStorageProperties(documentsPath = tempDir.resolve("does-not-exist").toString()),
            ),
        )

        service.cleanupOrphanedFiles()
    }

    @Test
    fun `leaves the now-empty household directory in place`() {
        writeFile("100/uuid_proof.pdf")
        every { documentRepository.findAllStoragePaths() } returns emptyList()

        service.cleanupOrphanedFiles()

        assertThat(tempDir.resolve("100")).exists()
    }
}
