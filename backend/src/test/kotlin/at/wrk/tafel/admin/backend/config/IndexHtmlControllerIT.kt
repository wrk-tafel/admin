package at.wrk.tafel.admin.backend.config

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.server.LocalServerPort
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import java.io.File
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse

// Exercises the real Spring wiring behind IndexHtmlController over real HTTP - property binding,
// static file resolution from disk, and (critically) actual DispatcherServlet routing precedence -
// which IndexHtmlControllerTest's mocked ResourceLoader/direct method calls don't cover.
//
// Both bugs this guards against shipped to the deployed dev environment despite a green unit test
// suite:
//   - relativeBaseUrl without a trailing slash (see the trailing-slash commit) - the unit test only
//     ever exercised a value that already had one.
//   - the SPA fallback route not existing at all (see #2972) - a direct navigation to a non-root
//     path 404'd for real, which a direct method call to spaFallback() can't detect since it
//     doesn't ask Spring whether GET /login actually gets routed there in the first place.
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class IndexHtmlControllerIT : TafelBaseIntegrationTest() {

    companion object {
        @DynamicPropertySource
        @JvmStatic
        fun dynamicProperties(registry: DynamicPropertyRegistry) {
            // Deliberately no trailing slash - mirrors the deployed dev environment's actual config.
            registry.add("tafeladmin.server.relativeBaseUrl") { "/tafel-admin" }
            registry.add("tafeladmin.environmentLabel") { "DEV" }
        }
    }

    @LocalServerPort
    private var port: Int = 0

    private val httpClient = HttpClient.newHttpClient()

    private val staticDir = File(System.getProperty("user.dir"), "static")
    private val indexHtmlFile = File(staticDir, "index.html")
    private val manifestFile = File(staticDir, "manifest.webmanifest")
    private val staticDirPreexisted = staticDir.exists()

    @BeforeEach
    fun beforeEach() {
        staticDir.mkdirs()
        indexHtmlFile.writeText(
            """
            <html>
                <head>
                    <base href="/">
                    <meta name="tafel-environment-label" content="">
                </head>
                <body>test</body>
            </html>
            """.trimIndent(),
        )
        manifestFile.writeText("{\n  \"name\": \"Tafel Admin\",\n  \"short_name\": \"Tafel Admin\"\n}")
    }

    @AfterEach
    fun afterEach() {
        indexHtmlFile.delete()
        manifestFile.delete()
        if (!staticDirPreexisted) {
            staticDir.delete()
        }
    }

    @Test
    fun `root path served with base href rewritten to the real configured relative base url`() {
        val response = get("/")

        assertThat(response.statusCode()).isEqualTo(HttpStatus.OK.value())
        assertThat(response.headers().firstValue("Content-Type").orElse(null)).startsWith(MediaType.TEXT_HTML_VALUE)
        assertThat(response.body()).isEqualTo(
            """
            <html>
                <head>
                    <base href="/tafel-admin/">
                    <meta name="tafel-environment-label" content="DEV">
                </head>
                <body>test</body>
            </html>
            """.trimIndent(),
        )
    }

    @Test
    fun `a top-level client-side route is routed to the spa fallback`() {
        val response = get("/login")

        assertThat(response.statusCode()).isEqualTo(HttpStatus.OK.value())
        assertThat(response.body()).contains("<base href=\"/tafel-admin/\">")
    }

    @Test
    fun `a nested client-side route is routed to the spa fallback`() {
        val response = get("/kunden/suchen")

        assertThat(response.statusCode()).isEqualTo(HttpStatus.OK.value())
        assertThat(response.body()).contains("<base href=\"/tafel-admin/\">")
    }

    @Test
    fun `the spa fallback also carries the real configured environment label meta tag`() {
        val response = get("/login")

        assertThat(response.statusCode()).isEqualTo(HttpStatus.OK.value())
        assertThat(response.body()).contains("""<meta name="tafel-environment-label" content="DEV">""")
    }

    @Test
    fun `an unauthenticated api request is not swallowed into the spa fallback`() {
        // WebSecurityConfig requires authentication on all of "/api/**", so an anonymous request
        // never reaches this controller at all - it's rejected by the security filter chain before
        // Spring MVC's handler mapping even runs. That's still the guarantee this test cares about:
        // an api path must never resolve to the app shell, authenticated or not.
        // IndexHtmlControllerTest separately unit-tests spaFallback()'s own "/api/" guard, which is
        // what protects an *authenticated* request to a nonexistent api endpoint from the same fate.
        val response = get("/api/some-nonexistent-endpoint")

        assertThat(response.statusCode()).isEqualTo(HttpStatus.UNAUTHORIZED.value())
        assertThat(response.body()).doesNotContain("<base href")
    }

    @Test
    fun `a request for a nonexistent static file is not swallowed into the spa fallback`() {
        val response = get("/nonexistent-file.js")

        assertThat(response.statusCode()).isEqualTo(HttpStatus.NOT_FOUND.value())
        assertThat(response.body()).doesNotContain("<base href")
    }

    @Test
    fun `missing index html on disk results in a 404 for both the root path and the spa fallback`() {
        indexHtmlFile.delete()

        assertThat(get("/").statusCode()).isEqualTo(HttpStatus.NOT_FOUND.value())
        assertThat(get("/login").statusCode()).isEqualTo(HttpStatus.NOT_FOUND.value())
    }

    @Test
    fun `manifest is served with name and short_name branded with the real configured environment label`() {
        val response = get("/manifest.webmanifest")

        assertThat(response.statusCode()).isEqualTo(HttpStatus.OK.value())
        assertThat(response.headers().firstValue("Content-Type").orElse(null)).startsWith("application/manifest+json")
        assertThat(response.body()).isEqualTo(
            "{\n  \"name\": \"Tafel Admin (DEV)\",\n  \"short_name\": \"Tafel Admin (DEV)\"\n}",
        )
    }

    @Test
    fun `missing manifest on disk results in a 404`() {
        manifestFile.delete()

        assertThat(get("/manifest.webmanifest").statusCode()).isEqualTo(HttpStatus.NOT_FOUND.value())
    }

    private fun get(path: String): HttpResponse<String> {
        val request = HttpRequest.newBuilder(URI.create("http://localhost:$port$path")).GET().build()
        return httpClient.send(request, HttpResponse.BodyHandlers.ofString())
    }
}
