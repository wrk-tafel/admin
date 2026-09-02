package at.wrk.tafel.admin.backend.modules.household.internal.document

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
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
import java.time.Duration
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
            tafelAdminProperties = TafelAdminProperties().apply { storage.documentsPath = tempDir.toString() },
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

    /**
     * The minimum age is configuration, not a constant: how long an upload can still be in flight
     * depends on the connection the files come in over, and getting that wrong deletes a document
     * out from under the request creating it.
     */
    @Test
    fun `keeps an unreferenced file younger than the configured minimum age`() {
        service = DocumentStorageCleanupService(
            documentRepository = documentRepository,
            tafelAdminProperties = TafelAdminProperties().apply {
                storage.documentsPath = tempDir.toString()
                storage.orphanedFileMinAge = Duration.ofHours(3)
            },
        )
        // Older than the default hour, younger than the three configured here
        val recentFile = writeFile("100/uuid_proof.pdf", ageInHours = 2)
        every { documentRepository.findAllStoragePaths() } returns emptyList()

        service.cleanupOrphanedFiles()

        assertThat(recentFile).exists()
    }

    @Test
    fun `is a no-op when the documents directory doesn't exist`() {
        service = DocumentStorageCleanupService(
            documentRepository = documentRepository,
            tafelAdminProperties = TafelAdminProperties().apply {
                storage.documentsPath = tempDir.resolve("does-not-exist").toString()
            },
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

    /**
     * Simulates a `documentsPath` remount: every referenced path (previously stored under a
     * different mount) points at a file that no longer exists under the current root, which would
     * otherwise make every real file on disk look orphaned too - see issue #3601.
     */
    @Test
    fun `aborts without deleting anything when most referenced paths are missing on disk`() {
        val stillPresentFile = writeFile("100/uuid_proof.pdf")
        val knownPaths = (1..19).map { "/old-mount/$it/uuid_missing.pdf" } + stillPresentFile.toAbsolutePath().toString()
        every { documentRepository.findAllStoragePaths() } returns knownPaths

        service.cleanupOrphanedFiles()

        assertThat(stillPresentFile).exists()
    }

    /**
     * The same missing-paths situation on a small deployment (below the guard's minimum sample size)
     * is indistinguishable from genuine staleness, so the plain per-file comparison still applies.
     */
    @Test
    fun `still cleans up below the guard's minimum sample size`() {
        val orphanedFile = writeFile("100/uuid_proof.pdf")
        every { documentRepository.findAllStoragePaths() } returns listOf("/old-mount/1/uuid_missing.pdf")

        service.cleanupOrphanedFiles()

        assertThat(orphanedFile).doesNotExist()
    }

    @Test
    fun `still cleans up when only a minority of referenced paths are missing on disk`() {
        val orphanedFile = writeFile("100/uuid_orphaned.pdf")
        val presentFiles = (1..19).map { writeFile("$it/uuid_present.pdf") }
        val knownPaths = presentFiles.map { it.toAbsolutePath().toString() } + "/old-mount/1/uuid_missing.pdf"
        every { documentRepository.findAllStoragePaths() } returns knownPaths

        service.cleanupOrphanedFiles()

        assertThat(orphanedFile).doesNotExist()
        presentFiles.forEach { assertThat(it).exists() }
    }
}
