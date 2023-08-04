package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import jakarta.servlet.http.Cookie
import jakarta.servlet.http.HttpServletRequest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException

@ExtendWith(MockKExtension::class)
internal class TafelJwtAuthConverterTest {

    @RelaxedMockK
    private lateinit var request: HttpServletRequest

    @InjectMockKs
    private lateinit var converter: TafelJwtAuthConverter

    @Test
    fun `convert - missing cookie`() {
        every { request.cookies } returns emptyArray()

        assertThrows<AuthenticationCredentialsNotFoundException> {
            converter.convert(request)
        }
    }

    @Test
    fun `convert - empty cookie`() {
        every { request.cookies } returns arrayOf(Cookie(TafelLoginFilter.jwtCookieName, "   "))

        assertThrows<AuthenticationCredentialsNotFoundException> {
            converter.convert(request)
        }
    }

    @Test
    fun `convert - cookie valid`() {
        val token = "TOKEN"
        every { request.cookies } returns arrayOf(Cookie(TafelLoginFilter.jwtCookieName, token))

        val result = converter.convert(request) as TafelJwtAuthentication

        assertThat(result.tokenValue).isEqualTo(token)
        assertThat(result.isAuthenticated).isFalse
    }

}
