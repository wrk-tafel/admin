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
import tools.jackson.databind.json.JsonMapper
import java.io.File
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.security.MessageDigest
import java.util.HexFormat

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
    private val ngswFile = File(staticDir, "ngsw.json")
    private val staticDirPreexisted = staticDir.exists()

    @BeforeEach
    fun beforeEach() {
        staticDir.mkdirs()
        indexHtmlFile.writeText(
            """
            <html>
                <head>
                    <base href="/">
                </head>
                <body><div class="tafel-app-loading-environment-label"></div></body>
            </html>
            """.trimIndent(),
        )
        manifestFile.writeText("{\n  \"name\": \"Tafel Admin\",\n  \"short_name\": \"Tafel Admin\"\n}")
    }

    @AfterEach
    fun afterEach() {
        indexHtmlFile.delete()
        manifestFile.delete()
        ngswFile.delete()
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
                </head>
                <body><div class="tafel-app-loading-environment-label">DEV</div></body>
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
    fun `the spa fallback also carries the real configured environment label in its loading screen`() {
        val response = get("/login")

        assertThat(response.statusCode()).isEqualTo(HttpStatus.OK.value())
        assertThat(response.body()).contains("""<div class="tafel-app-loading-environment-label">DEV</div>""")
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
            "{\n  \"name\": \"Tafel Admin (DEV)\",\n  \"short_name\": \"Tafel DEV\"\n}",
        )
    }

    @Test
    fun `missing manifest on disk results in a 404`() {
        manifestFile.delete()

        assertThat(get("/manifest.webmanifest").statusCode()).isEqualTo(HttpStatus.NOT_FOUND.value())
    }

    @Test
    fun `index html requested by its file name is rewritten like the root path`() {
        val response = get("/index.html")

        assertThat(response.statusCode()).isEqualTo(HttpStatus.OK.value())
        assertThat(response.body()).isEqualTo(get("/").body())
    }

    /**
     * Issue #3872: the worker resolves these URLs against the origin, and checks each file it
     * fetches against its hash - so the hashes have to be those of the bytes actually served. The
     * index carries a non-ASCII character to catch a response written in a charset other than the
     * one hashed.
     */
    @Test
    fun `service worker manifest carries the base path and the hashes of the files as served`() {
        indexHtmlFile.writeText("<html><head><base href=\"/\"></head><body>Wird geladen …</body></html>")
        ngswFile.writeText(
            """
            {
              "configVersion": 1,
              "index": "/index.html",
              "assetGroups": [{"name": "app", "installMode": "prefetch", "urls": ["/assets/favicon.ico", "/index.html", "/manifest.webmanifest"]}],
              "dataGroups": [],
              "hashTable": {"/assets/favicon.ico": "fcd991f15477516f929c3f06638afa41406e00dd", "/index.html": "0000", "/manifest.webmanifest": "0000"},
              "navigationUrls": [{"positive": true, "regex": "^\\/.*$"}]
            }
            """.trimIndent(),
        )

        val response = get("/ngsw.json")

        assertThat(response.statusCode()).isEqualTo(HttpStatus.OK.value())
        val manifest = JsonMapper().readTree(response.body())
        assertThat(manifest["index"].stringValue()).isEqualTo("/tafel-admin/index.html")
        assertThat(manifest["assetGroups"][0]["urls"].values().map { it.stringValue() }).containsExactly(
            "/tafel-admin/assets/favicon.ico",
            "/tafel-admin/index.html",
            "/tafel-admin/manifest.webmanifest",
        )
        val hashTable = manifest["hashTable"]
        assertThat(hashTable.propertyNames()).containsExactlyInAnyOrder(
            "/tafel-admin/assets/favicon.ico",
            "/tafel-admin/index.html",
            "/tafel-admin/manifest.webmanifest",
        )
        assertThat(hashTable["/tafel-admin/assets/favicon.ico"].stringValue()).isEqualTo("fcd991f15477516f929c3f06638afa41406e00dd")
        assertThat(hashTable["/tafel-admin/index.html"].stringValue()).isEqualTo(sha1(getBytes("/index.html")))
        assertThat(hashTable["/tafel-admin/manifest.webmanifest"].stringValue()).isEqualTo(sha1(getBytes("/manifest.webmanifest")))
        assertThat(manifest["navigationUrls"][0]["regex"].stringValue()).isEqualTo("^\\/.*$")
    }

    @Test
    fun `missing service worker manifest on disk results in a 404`() {
        assertThat(get("/ngsw.json").statusCode()).isEqualTo(HttpStatus.NOT_FOUND.value())
    }

    private fun sha1(bytes: ByteArray): String = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-1").digest(bytes))

    private fun getBytes(path: String): ByteArray {
        val request = HttpRequest.newBuilder(URI.create("http://localhost:$port$path")).GET().build()
        return httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray()).body()
    }

    private fun get(path: String): HttpResponse<String> {
        val request = HttpRequest.newBuilder(URI.create("http://localhost:$port$path")).GET().build()
        return httpClient.send(request, HttpResponse.BodyHandlers.ofString())
    }
}
