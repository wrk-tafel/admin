package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Test
import org.springframework.mock.web.MockFilterChain
import org.springframework.mock.web.MockHttpServletRequest
import org.springframework.mock.web.MockHttpServletResponse
import org.springframework.security.core.context.SecurityContextHolder

class MfaPendingFilterTest {

    private val filter = MfaPendingFilter()

    @AfterEach
    fun afterEach() {
        SecurityContextHolder.clearContext()
    }

    private fun authenticate(mfaPending: Boolean = false, mfaSetupRequired: Boolean = false) {
        SecurityContextHolder.getContext().authentication = TafelJwtAuthentication(
            tokenValue = "token",
            username = "max",
            authenticated = true,
            mfaPending = mfaPending,
            mfaSetupRequired = mfaSetupRequired,
        )
    }

    private fun run(method: String, path: String): Pair<MockHttpServletResponse, MockFilterChain> {
        val request = MockHttpServletRequest(method, path).apply { servletPath = path }
        val response = MockHttpServletResponse()
        val chain = MockFilterChain()
        filter.doFilter(request, response, chain)
        return response to chain
    }

    private fun reachedController(chain: MockFilterChain) = chain.request != null

    private fun assertAllowed(calls: List<Pair<String, String>>) = calls.forEach { (method, path) ->
        val (response, chain) = run(method, path)
        assertThat(reachedController(chain)).describedAs("$method $path").isTrue()
        assertThat(response.status).describedAs("$method $path").isEqualTo(200)
    }

    private fun assertRefused(calls: List<Pair<String, String>>) = calls.forEach { (method, path) ->
        val (response, chain) = run(method, path)
        assertThat(reachedController(chain)).describedAs("$method $path").isFalse()
        assertThat(response.status).describedAs("$method $path").isEqualTo(403)
    }

    @Test
    fun `a session that owes its code may hand it in, have the e-mailed one sent, ask who it is and log out`() {
        authenticate(mfaPending = true)

        assertAllowed(
            listOf(
                "POST" to "/api/mfa/verify",
                "POST" to "/api/mfa/email/send",
                "GET" to "/api/users/info",
                "POST" to "/api/users/logout",
            ),
        )
    }

    // The endpoints that ask only isAuthenticated() are the ones a permission check would not stop.
    @Test
    fun `a session that owes its code is refused everything else`() {
        authenticate(mfaPending = true)

        assertRefused(
            listOf(
                "GET" to "/api/users/export",
                "POST" to "/api/users/change-password",
                "PUT" to "/api/users/theme",
                "GET" to "/api/users/privacy-notice-template",
                "GET" to "/api/mfa",
                "POST" to "/api/mfa/setup",
                "POST" to "/api/mfa/enable",
                "POST" to "/api/mfa/email/setup",
                "POST" to "/api/mfa/email/enable",
                "POST" to "/api/mfa/disable",
                "GET" to "/api/households",
                "POST" to "/api/users/info",
                "GET" to "/api/mfa/verify",
            ),
        )
    }

    @Test
    fun `a session that has to set a method up may read the status, set either method up, ask who it is and log out`() {
        authenticate(mfaSetupRequired = true)

        assertAllowed(
            listOf(
                "GET" to "/api/mfa",
                "POST" to "/api/mfa/setup",
                "POST" to "/api/mfa/enable",
                "POST" to "/api/mfa/email/setup",
                "POST" to "/api/mfa/email/enable",
                "GET" to "/api/users/info",
                "POST" to "/api/users/logout",
            ),
        )
    }

    @Test
    fun `a session that has to set a method up is refused everything else`() {
        authenticate(mfaSetupRequired = true)

        assertRefused(
            listOf(
                "GET" to "/api/users/export",
                "POST" to "/api/users/change-password",
                "PUT" to "/api/users/theme",
                "GET" to "/api/households",
                "POST" to "/api/mfa/verify",
                "POST" to "/api/mfa/email/send",
                "POST" to "/api/mfa/disable",
                "DELETE" to "/api/users/5/mfa",
            ),
        )
    }

    @Test
    fun `a completed session is left alone`() {
        authenticate()

        assertAllowed(listOf("GET" to "/api/users/export", "POST" to "/api/mfa/disable"))
    }

    @Test
    fun `a request without a session is left to the rest of the chain`() {
        val (response, chain) = run("GET", "/api/users/export")

        assertThat(reachedController(chain)).isTrue()
        assertThat(response.status).isEqualTo(200)
    }
}
