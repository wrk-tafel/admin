package at.wrk.tafel.admin.backend.common.auth.websocket

import at.wrk.tafel.admin.backend.common.auth.components.TafelJwtAuthConverter
import at.wrk.tafel.admin.backend.common.auth.components.TafelJwtAuthProvider
import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import jakarta.servlet.http.HttpServletRequest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.http.server.ServletServerHttpRequest
import org.springframework.security.authentication.CredentialsExpiredException
import org.springframework.web.socket.WebSocketHandler

@ExtendWith(MockKExtension::class)
internal class TafelWebSocketJwtAuthHandshakeHandlerTest {

    @RelaxedMockK
    private lateinit var authConverter: TafelJwtAuthConverter

    @RelaxedMockK
    private lateinit var authProvider: TafelJwtAuthProvider

    @RelaxedMockK
    private lateinit var serverHttpRequest: ServletServerHttpRequest

    @RelaxedMockK
    private lateinit var request: HttpServletRequest

    @RelaxedMockK
    private lateinit var wsHandler: WebSocketHandler

    @InjectMockKs
    private lateinit var handler: TafelWebSocketJwtAuthHandshakeHandler

    @BeforeEach
    fun beforeEach() {
        every { serverHttpRequest.servletRequest } returns request
    }

    @Test
    fun `determineUser no authentication given`() {
        every { authConverter.convert(any()) } returns null

        val result = handler.determineUser(serverHttpRequest, wsHandler, mutableMapOf())

        assertThat(result).isNull()

        verify { authConverter.convert(request) }
    }

    @Test
    fun `determineUser authentication given but invalid`() {
        val authentication = TafelJwtAuthentication(tokenValue = "", authenticated = false)
        every { authConverter.convert(any()) } returns authentication
        every { authProvider.authenticate(authentication) } throws CredentialsExpiredException("Invalid credentials")

        val result = handler.determineUser(serverHttpRequest, wsHandler, mutableMapOf())

        assertThat(result).isNull()

        verify { authConverter.convert(request) }
        verify { authProvider.authenticate(authentication) }
    }

    @Test
    fun `determineUser authentication given and valid`() {
        val authentication = TafelJwtAuthentication(tokenValue = "", authenticated = true)
        every { authConverter.convert(any()) } returns authentication
        every { authProvider.authenticate(authentication) } returns authentication

        val result = handler.determineUser(serverHttpRequest, wsHandler, mutableMapOf())

        assertThat(result).isEqualTo(authentication)

        verify { authConverter.convert(request) }
        verify { authProvider.authenticate(authentication) }
    }

}
