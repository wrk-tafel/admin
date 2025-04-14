package at.wrk.tafel.admin.backend.common.auth.websocket

import at.wrk.tafel.admin.backend.common.auth.components.JwtTokenService
import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import io.jsonwebtoken.Claims
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.web.socket.WebSocketHandler
import org.springframework.web.socket.WebSocketSession
import java.time.LocalDate
import java.time.ZoneOffset
import java.util.*

@ExtendWith(MockKExtension::class)
internal class TafelWebSocketCloseHandlerDecoratorTest {

    @RelaxedMockK
    private lateinit var tokenService: JwtTokenService

    @RelaxedMockK
    private lateinit var delegate: WebSocketHandler

    @RelaxedMockK
    private lateinit var timer: Timer

    @RelaxedMockK
    private lateinit var session: WebSocketSession

    @RelaxedMockK
    private lateinit var claims: Claims

    @InjectMockKs
    private lateinit var handler: TafelWebSocketCloseHandlerDecorator

    @Test
    fun `session close scheduled successfully`() {
        val authentication = TafelJwtAuthentication(tokenValue = "", authenticated = false)
        every { session.principal } returns authentication
        every { tokenService.getClaimsFromToken(authentication.tokenValue) } returns claims
        every { claims.expiration } returns Date.from(
            LocalDate.now().plusDays(1).atStartOfDay(ZoneOffset.systemDefault()).toInstant()
        )

        handler.afterConnectionEstablished(session)

        verify {
            timer.schedule(any(), withArg<Long> {
                assertThat(it).isPositive
                assertThat(it).isNotZero()
            })
        }
    }

    @Test
    fun `session close immediately when unauthenticated`() {
        every { session.principal } returns null

        handler.afterConnectionEstablished(session)

        verify {
            timer.schedule(any(), withArg<Long> {
                assertThat(it).isZero()
            })
        }
    }

}
