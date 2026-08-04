package at.wrk.tafel.admin.backend.config

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import java.io.File

// Exercises the real Spring wiring behind IndexHtmlController - property binding and static file
// resolution from disk - which IndexHtmlControllerTest's mocked ResourceLoader doesn't cover.
// See #2972/#2978: relativeBaseUrl without a trailing slash (as configured on the deployed dev
// environment) broke every asset URL in production despite the unit test suite passing, because
// that test only ever exercised a value that already had one.
class IndexHtmlControllerIT : TafelBaseIntegrationTest() {

    companion object {
        @DynamicPropertySource
        @JvmStatic
        fun dynamicProperties(registry: DynamicPropertyRegistry) {
            // Deliberately no trailing slash - mirrors the deployed dev environment's actual config.
            registry.add("tafeladmin.server.relativeBaseUrl") { "/tafel-admin" }
        }
    }

    @Autowired
    private lateinit var indexHtmlController: IndexHtmlController

    private val staticDir = File(System.getProperty("user.dir"), "static")
    private val indexHtmlFile = File(staticDir, "index.html")
    private val staticDirPreexisted = staticDir.exists()

    @BeforeEach
    fun beforeEach() {
        staticDir.mkdirs()
        indexHtmlFile.writeText("<html><head><base href=\"/\"></head><body>test</body></html>")
    }

    @AfterEach
    fun afterEach() {
        indexHtmlFile.delete()
        if (!staticDirPreexisted) {
            staticDir.delete()
        }
    }

    @Test
    fun `index html served with base href rewritten to the real configured relative base url`() {
        val response = indexHtmlController.index()

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.headers.contentType).isEqualTo(MediaType.TEXT_HTML)
        assertThat(response.body).isEqualTo(
            "<html><head><base href=\"/tafel-admin/\"></head><body>test</body></html>",
        )
    }

    @Test
    fun `missing index html on disk results in a 404`() {
        indexHtmlFile.delete()

        val response = indexHtmlController.index()

        assertThat(response.statusCode).isEqualTo(HttpStatus.NOT_FOUND)
    }
}
