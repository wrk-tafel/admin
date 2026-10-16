package at.wrk.tafel.admin.backend.common.auth

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.server.LocalServerPort
import org.springframework.http.HttpStatus
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse

/**
 * The password reset is reached without a session and without a CSRF token - decided by the security
 * filter chain (`WebSecurityConfig.publicEndpoints` and its CSRF exemption), which
 * `PasswordResetControllerTest` cannot see.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class PasswordResetEndpointsIT : TafelBaseIntegrationTest() {

    @LocalServerPort
    private var port: Int = 0

    private val httpClient = HttpClient.newHttpClient()

    @Test
    fun `an anonymous caller can ask for a link and gets no hint whether the account exists`() {
        val response = post("/api/password-reset/request", """{"identifier":"nobody-at-all"}""")

        assertThat(response.statusCode()).isEqualTo(HttpStatus.ACCEPTED.value())
    }

    @Test
    fun `an anonymous caller handing in an unknown token is told the link is gone`() {
        val response = post("/api/password-reset/confirm", """{"token":"not-a-token","newPassword":"aNewSecretPassword-1"}""")

        assertThat(response.statusCode()).isEqualTo(HttpStatus.GONE.value())
        assertThat(response.body()).contains("ungültig oder abgelaufen")
    }

    @Test
    fun `everything else stays behind authentication`() {
        val response = post("/api/users/search", "{}")

        assertThat(response.statusCode()).isIn(HttpStatus.UNAUTHORIZED.value(), HttpStatus.FORBIDDEN.value())
    }

    private fun post(path: String, body: String): HttpResponse<String> {
        val request = HttpRequest.newBuilder(URI.create("http://localhost:$port$path"))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build()
        return httpClient.send(request, HttpResponse.BodyHandlers.ofString())
    }
}
