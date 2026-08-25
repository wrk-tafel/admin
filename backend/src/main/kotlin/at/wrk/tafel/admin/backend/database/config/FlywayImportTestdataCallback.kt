package at.wrk.tafel.admin.backend.database.config

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.pdf.PDFService
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import com.fasterxml.jackson.annotation.JsonRootName
import org.apache.commons.io.IOUtils
import org.flywaydb.core.api.callback.BaseCallback
import org.flywaydb.core.api.callback.Context
import org.flywaydb.core.api.callback.Event
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.core.io.ClassPathResource
import org.springframework.jdbc.datasource.init.ScriptUtils
import org.springframework.stereotype.Component
import org.springframework.util.MimeTypeUtils
import java.nio.file.Files
import java.nio.file.Paths
import java.sql.Connection
import java.util.UUID

@Component
@ExcludeFromTestCoverage
class FlywayImportTestdataCallback(
    @param:Value("\${tafeladmin.testdata.enabled:false}") private val testdataEnabled: Boolean,
    @param:Value("/db-migration-testdata/testdata.sql") val sqlFileClassPath: String? = null,
    private val tafelAdminProperties: TafelAdminProperties,
    private val pdfService: PDFService,
) : BaseCallback() {

    companion object {
        private val LOGGER = LoggerFactory.getLogger(FlywayImportTestdataCallback::class.java)
        private const val LOGO_RESOURCE_PATH = "/assets/logo.png"
        private const val PLACEHOLDER_STYLESHEET_PATH = "/pdf-templates/testdata/placeholder-document.xsl"
    }

    override fun handle(event: Event, context: Context) {
        if (testdataEnabled && event == Event.AFTER_MIGRATE) {
            LOGGER.info("Importing testdata ...")
            ScriptUtils.executeSqlScript(context.connection, ClassPathResource("$sqlFileClassPath"))
            seedDocuments(context.connection)
            LOGGER.info("Importing testdata finished!")
        }
    }

    /**
     * Uploads a handful of documents onto a few testdata households the same way a real upload
     * would - a real file under [TafelAdminProperties.storage]'s `documentsPath`, not just a
     * dangling database row - so the "Dokumente" tab has something to look at during local
     * development instead of always being empty.
     *
     * Lives here rather than in the household module, and talks to the database through the plain
     * JDBC [Connection] Flyway already hands this callback rather than Spring Data: this method runs
     * while `Flyway`/`EntityManagerFactory` are themselves still being constructed (this callback is
     * one of the `Callback` beans Flyway's own bean definition collects), so a JPA repository
     * dependency here is a circular one - confirmed by trying it, not just reasoned about - and
     * `HouseholdRepository`/`DocumentRepository` cannot be injected into this class. This also has to
     * run in lockstep with `testdata.sql` on *every* import, including [TestdataScriptIT]'s second
     * migrate over an already-populated schema, which rules out an `ApplicationRunner` (runs once at
     * startup) or a plain application-event listener (would race the listener bean's own creation)
     * as alternatives - an `AFTER_MIGRATE` callback is the one hook guaranteed to fire every time.
     */
    private fun seedDocuments(connection: Connection) {
        seedIdAndIncomeProof(connection, householdId = 101, description = "Eva Musterfrau")
        seedIdAndIncomeProof(connection, householdId = 110, description = "Anna Vielverdiener")
        seedIdAndIncomeProof(connection, householdId = 115, description = "Georg Großfamilie")
    }

    private fun seedIdAndIncomeProof(connection: Connection, householdId: Long, description: String) {
        val householdEntityId = findHouseholdEntityId(connection, householdId) ?: return

        storeDocument(connection, householdEntityId, householdId, "ID", "ausweis.png", MimeTypeUtils.IMAGE_PNG_VALUE, loadLogoBytes())
        storeDocument(
            connection,
            householdEntityId,
            householdId,
            "PROOF_OF_INCOME",
            "einkommensnachweis.pdf",
            "application/pdf",
            buildPlaceholderPdf(
                title = "Einkommensnachweis",
                body = "Platzhalter-Testdokument für $description - erzeugt von FlywayImportTestdataCallback.",
            ),
        )
    }

    private fun findHouseholdEntityId(connection: Connection, householdId: Long): Long? = connection.prepareStatement(
        "SELECT id FROM households WHERE household_id = ?",
    ).use { statement ->
        statement.setLong(1, householdId)
        statement.executeQuery().use { resultSet -> if (resultSet.next()) resultSet.getLong("id") else null }
    }

    private fun storeDocument(
        connection: Connection,
        householdEntityId: Long,
        householdId: Long,
        documentType: String,
        fileName: String,
        contentType: String,
        bytes: ByteArray,
    ) {
        val householdDir = Paths.get(tafelAdminProperties.storage.documentsPath, householdId.toString())
        Files.createDirectories(householdDir)
        val storagePath = householdDir.resolve("${UUID.randomUUID()}_$fileName").toAbsolutePath().toString()
        Files.write(Paths.get(storagePath), bytes)

        val documentId = connection.prepareStatement("SELECT nextval('household_documents_seq')").use { statement ->
            statement.executeQuery().use { resultSet ->
                resultSet.next()
                resultSet.getLong(1)
            }
        }
        connection.prepareStatement(
            """
            INSERT INTO household_documents (id, created_at, updated_at, household_id, document_type, file_name, content_type, storage_path)
            VALUES (?, NOW(), NOW(), ?, ?, ?, ?, ?)
            """.trimIndent(),
        ).use { statement ->
            statement.setLong(1, documentId)
            statement.setLong(2, householdEntityId)
            statement.setString(3, documentType)
            statement.setString(4, fileName)
            statement.setString(5, contentType)
            statement.setString(6, storagePath)
            statement.executeUpdate()
        }
    }

    private fun loadLogoBytes(): ByteArray = IOUtils.toByteArray(javaClass.getResourceAsStream(LOGO_RESOURCE_PATH))

    private fun buildPlaceholderPdf(title: String, body: String): ByteArray = pdfService.generatePdf(
        TestdataPlaceholderPdfData(title = title, body = body),
        PLACEHOLDER_STYLESHEET_PATH,
    )
}

@JsonRootName("data")
@ExcludeFromTestCoverage
data class TestdataPlaceholderPdfData(
    val title: String,
    val body: String,
)
