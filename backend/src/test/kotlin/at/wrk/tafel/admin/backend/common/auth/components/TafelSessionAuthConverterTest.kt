package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.auth.model.TafelAuthentication
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.mock.web.MockHttpServletRequest
import org.springframework.mock.web.MockHttpSession
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException
import java.time.Instant

internal class TafelSessionAuthConverterTest {

    private val converter = TafelSessionAuthConverter()

    @Test
    fun `convert - no session`() {
        val request = MockHttpServletRequest()

        assertThrows<AuthenticationCredentialsNotFoundException> {
            converter.convert(request)
        }
    }

    @Test
    fun `convert - a session without a login`() {
        val request = MockHttpServletRequest()
        request.setSession(MockHttpSession())

        assertThrows<AuthenticationCredentialsNotFoundException> {
            converter.convert(request)
        }
    }

    @Test
    fun `convert - a session without its key`() {
        val request = MockHttpServletRequest()
        request.setSession(MockHttpSession().apply { setAttribute(TafelSessionAttributes.USERNAME, "user") })

        assertThrows<AuthenticationCredentialsNotFoundException> {
            converter.convert(request)
        }
    }

    @Test
    fun `convert - a login session`() {
        val session = MockHttpSession()
        session.setAttribute(TafelSessionAttributes.USERNAME, "user")
        session.setAttribute(TafelSessionAttributes.SESSION_KEY, "KEY")
        val request = MockHttpServletRequest()
        request.setSession(session)

        val result = converter.convert(request) as TafelAuthentication

        assertThat(result.username).isEqualTo("user")
        assertThat(result.sessionKey).isEqualTo("KEY")
        assertThat(result.mfaVerified).isFalse()
        assertThat(result.sessionCreatedAt).isEqualTo(Instant.ofEpochMilli(session.creationTime))
        assertThat(result.isAuthenticated).isFalse
    }

    @Test
    fun `convert - a login session that passed the second factor`() {
        val session = MockHttpSession()
        session.setAttribute(TafelSessionAttributes.USERNAME, "user")
        session.setAttribute(TafelSessionAttributes.SESSION_KEY, "KEY")
        session.setAttribute(TafelSessionAttributes.MFA_VERIFIED, "true")
        val request = MockHttpServletRequest()
        request.setSession(session)

        val result = converter.convert(request) as TafelAuthentication

        assertThat(result.mfaVerified).isTrue()
    }
}
