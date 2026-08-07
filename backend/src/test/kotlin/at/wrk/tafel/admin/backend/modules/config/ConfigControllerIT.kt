package at.wrk.tafel.admin.backend.modules.config

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.server.LocalServerPort
import org.springframework.http.HttpStatus
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse

/**
 * Which of the two endpoints an anonymous caller gets through to is decided by the security filter
 * chain (`WebSecurityConfig.publicEndpoints`), not by the controller - `ConfigControllerTest` calls
 * its methods directly and so can't tell whether `/api/config/public` is actually reachable without
 * a JWT cookie, or whether `/api/config` still isn't.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ConfigControllerIT : TafelBaseIntegrationTest() {

    companion object {
        @DynamicPropertySource
        @JvmStatic
        fun dynamicProperties(registry: DynamicPropertyRegistry) {
            registry.add("tafeladmin.environmentLabel") { "DEV" }
        }
    }

    @LocalServerPort
    private var port: Int = 0

    private val httpClient = HttpClient.newHttpClient()

    @Test
    fun `public config is served to an anonymous caller`() {
        val response = get("/api/config/public")

        assertThat(response.statusCode()).isEqualTo(HttpStatus.OK.value())
        assertThat(response.body()).isEqualTo("""{"environmentLabel":"DEV"}""")
    }

    @Test
    fun `full config stays behind authentication`() {
        val response = get("/api/config")

        assertThat(response.statusCode()).isEqualTo(HttpStatus.UNAUTHORIZED.value())
        assertThat(response.body()).doesNotContain("version")
    }

    private fun get(path: String): HttpResponse<String> {
        val request = HttpRequest.newBuilder(URI.create("http://localhost:$port$path")).GET().build()
        return httpClient.send(request, HttpResponse.BodyHandlers.ofString())
    }
}
