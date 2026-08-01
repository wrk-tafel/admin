package at.wrk.tafel.admin.backend.modules.support.internal

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.config.properties.TafelAdminSupportProperties
import at.wrk.tafel.admin.backend.modules.base.exception.TafelApiException
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.test.web.client.ExpectedCount
import org.springframework.test.web.client.MockRestServiceServer
import org.springframework.test.web.client.match.MockRestRequestMatchers.content
import org.springframework.test.web.client.match.MockRestRequestMatchers.header
import org.springframework.test.web.client.match.MockRestRequestMatchers.method
import org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo
import org.springframework.test.web.client.response.MockRestResponseCreators.withStatus
import org.springframework.web.client.RestClient

class SupportServiceTest {

    private val restClientBuilder = RestClient.builder()
    private val mockServer = MockRestServiceServer.bindTo(restClientBuilder).build()
    private val restClient = restClientBuilder.baseUrl("https://api.github.com").build()

    @Test
    fun `creates a github issue with the support prefix and full text as body`() {
        val properties = TafelAdminProperties(
            support = TafelAdminSupportProperties(githubToken = "test-token", githubRepository = "wrk-tafel/admin"),
        )
        val service = SupportService(properties, restClient)

        mockServer.expect(ExpectedCount.once(), requestTo("https://api.github.com/repos/wrk-tafel/admin/issues"))
            .andExpect(method(org.springframework.http.HttpMethod.POST))
            .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer test-token"))
            .andExpect(header(HttpHeaders.ACCEPT, "application/vnd.github+json"))
            .andExpect(header("X-GitHub-Api-Version", "2022-11-28"))
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andExpect(content().json("""{"title":"Support: Something is broken","body":"Something is broken\nmore details"}"""))
            .andRespond(withStatus(HttpStatus.CREATED))

        service.createSupportIssue("Something is broken\nmore details")

        mockServer.verify()
    }

    @Test
    fun `truncates a long first line for the issue title`() {
        val properties = TafelAdminProperties(
            support = TafelAdminSupportProperties(githubToken = "test-token", githubRepository = "wrk-tafel/admin"),
        )
        val service = SupportService(properties, restClient)
        val longText = "x".repeat(120)

        mockServer.expect(requestTo("https://api.github.com/repos/wrk-tafel/admin/issues"))
            .andExpect(content().json("""{"title":"Support: ${"x".repeat(80)}","body":"$longText"}"""))
            .andRespond(withStatus(HttpStatus.CREATED))

        service.createSupportIssue(longText)

        mockServer.verify()
    }

    @Test
    fun `fails clearly when no github token is configured`() {
        val properties = TafelAdminProperties(
            support = TafelAdminSupportProperties(githubToken = null, githubRepository = "wrk-tafel/admin"),
        )
        val service = SupportService(properties, restClient)

        assertThatThrownBy { service.createSupportIssue("Something is broken") }
            .isInstanceOf(TafelApiException::class.java)
            .satisfies({ ex ->
                assertThat((ex as TafelApiException).statusCode).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR)
            })

        // no request expectation was registered above - verify() confirms none was made either
        mockServer.verify()
    }

    @Test
    fun `fails clearly when support is not configured at all`() {
        val properties = TafelAdminProperties(support = null)
        val service = SupportService(properties, restClient)

        assertThatThrownBy { service.createSupportIssue("Something is broken") }
            .isInstanceOf(TafelApiException::class.java)
            .satisfies({ ex ->
                assertThat((ex as TafelApiException).statusCode).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR)
            })

        mockServer.verify()
    }
}
