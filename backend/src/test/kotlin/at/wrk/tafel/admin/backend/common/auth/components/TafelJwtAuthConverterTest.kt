package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import jakarta.servlet.http.HttpServletRequest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.http.HttpHeaders
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException
import org.springframework.security.authentication.BadCredentialsException
import java.util.*

@ExtendWith(MockKExtension::class)
internal class TafelJwtAuthConverterTest {

    @RelaxedMockK
    private lateinit var request: HttpServletRequest

    @InjectMockKs
    private lateinit var converter: TafelJwtAuthConverter

    @Test
    fun `convert - missing header`() {
        every { request.getHeader(HttpHeaders.AUTHORIZATION) } returns null

        assertThrows<AuthenticationCredentialsNotFoundException> {
            converter.convert(request)
        }
    }

    @Test
    fun `convert - header with invalid prefix`() {
        every { request.headerNames } returns Collections.enumeration(listOf(HttpHeaders.AUTHORIZATION))
        every { request.getHeader(HttpHeaders.AUTHORIZATION) } returns "WRONG TEST123"

        assertThrows<BadCredentialsException> {
            converter.convert(request)
        }
    }

    @Test
    fun `convert - header valid`() {
        val token = "TEST123"
        every { request.headerNames } returns Collections.enumeration(listOf(HttpHeaders.AUTHORIZATION.uppercase()))
        every { request.getHeader(HttpHeaders.AUTHORIZATION) } returns "Bearer $token"

        val result = converter.convert(request) as TafelJwtAuthentication

        assertThat(result.tokenValue).isEqualTo(token)
        assertThat(result.isAuthenticated).isFalse
    }

}
