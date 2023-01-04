package at.wrk.tafel.admin.backend.common.auth.components

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthenticationToken
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import jakarta.servlet.http.HttpServletRequest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.http.HttpHeaders

@ExtendWith(MockKExtension::class)
internal class TafelJwtAuthConverterTest {

    @RelaxedMockK
    private lateinit var request: HttpServletRequest

    @InjectMockKs
    private lateinit var converter: TafelJwtAuthConverter

    @Test
    fun `convert - missing header`() {
        every { request.getHeader(HttpHeaders.AUTHORIZATION) } returns null

        val result = converter.convert(request)

        assertThat(result).isNull()
    }

    @Test
    fun `convert - header with invalid prefix`() {
        every { request.getHeader(HttpHeaders.AUTHORIZATION) } returns "WRONG TEST123"

        val result = converter.convert(request)

        assertThat(result).isNull()
    }

    @Test
    fun `convert - header valid`() {
        val token = "TEST123"
        every { request.getHeader(HttpHeaders.AUTHORIZATION) } returns "Bearer $token"

        val result = converter.convert(request) as TafelJwtAuthenticationToken

        assertThat(result.tokenValue).isEqualTo(token)
        assertThat(result.isAuthenticated).isFalse
    }

}
