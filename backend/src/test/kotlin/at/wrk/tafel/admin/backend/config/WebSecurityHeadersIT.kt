package at.wrk.tafel.admin.backend.config

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import at.wrk.tafel.admin.backend.common.auth.components.TafelAccessDeniedHandler
import at.wrk.tafel.admin.backend.database.model.auth.LoginAttemptIpRepository
import at.wrk.tafel.admin.backend.database.model.auth.LoginAttemptRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.server.LocalServerPort
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.util.Base64

// Response headers Spring Security's HeaderWriterFilter writes are asserted here rather than in
// WebSecurityConfigTest, because a mocked/direct call to securityFilterChain() never runs a real
// filter chain over a real response - only a real HTTP round-trip proves what a browser actually
// receives. HeaderWriterFilter runs ahead of AuthorizationFilter and wraps the response to write
// its headers no matter which filter ultimately commits it, so an anonymous (401) request is
// enough to prove these headers are present - no login flow needed.
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class WebSecurityHeadersIT : TafelBaseIntegrationTest() {

    @LocalServerPort
    private var port: Int = 0

    @Autowired
    private lateinit var loginAttemptRepository: LoginAttemptRepository

    @Autowired
    private lateinit var loginAttemptIpRepository: LoginAttemptIpRepository

    private val httpClient = HttpClient.newHttpClient()

    @AfterEach
    fun afterEach() {
        // the wrong login below counts as a failed attempt, which no other test should inherit
        loginAttemptRepository.deleteAll()
        loginAttemptIpRepository.deleteAll()
    }

    @Test
    fun `referrer policy and permissions policy are set on an api response`() {
        val response = get("/api/config/public")

        assertThat(response.headers().firstValue("Referrer-Policy").orElse(null)).isEqualTo("no-referrer")
        assertThat(response.headers().firstValue("Permissions-Policy").orElse(null)).isEqualTo(
            "geolocation=(), microphone=(), payment=(), usb=(), camera=(self), clipboard-write=(self)",
        )
    }

    @Test
    fun `an api json response is sent with cache-control no-store`() {
        val response = get("/api/config/public")

        assertThat(response.headers().firstValue("Cache-Control").orElse(null)).contains("no-store")
    }

    @Test
    fun `a document download response is sent with cache-control no-store`() {
        // Anonymous, so this 401s before HouseholdDocumentController ever runs - but the header is
        // written by the security filter chain regardless of the eventual status, see class doc.
        val response = get("/api/households/1/documents/1")

        assertThat(response.headers().firstValue("Cache-Control").orElse(null)).contains("no-store")
    }

    // The handler sets the header and then calls sendError, after which the container renders the
    // error response in a dispatch of its own - only a real round-trip shows the header survives that.
    @Test
    fun `a request refused for its CSRF token says so in a header`() {
        val response = post("/api/support")

        assertThat(response.statusCode()).isEqualTo(403)
        assertThat(response.headers().firstValue(TafelAccessDeniedHandler.CSRF_REJECTED_HEADER).orElse(null))
            .isEqualTo("true")
    }

    @Test
    fun `a login refused for its credentials is not marked as a CSRF rejection`() {
        val credentials = Base64.getEncoder().encodeToString("no-such-user:wrong-password".toByteArray())

        val response = post("/api/login", "Authorization" to "Basic $credentials")

        assertThat(response.statusCode()).isEqualTo(403)
        assertThat(response.headers().firstValue(TafelAccessDeniedHandler.CSRF_REJECTED_HEADER)).isEmpty()
    }

    private fun post(path: String, vararg headers: Pair<String, String>): HttpResponse<String> {
        val request = HttpRequest.newBuilder(URI.create("http://localhost:$port$path"))
            .POST(HttpRequest.BodyPublishers.noBody())
        headers.forEach { (name, value) -> request.header(name, value) }
        return httpClient.send(request.build(), HttpResponse.BodyHandlers.ofString())
    }

    private fun get(path: String): HttpResponse<String> {
        val request = HttpRequest.newBuilder(URI.create("http://localhost:$port$path")).GET().build()
        return httpClient.send(request, HttpResponse.BodyHandlers.ofString())
    }
}
