package at.wrk.tafel.admin.backend.common.auth.websocket

import at.wrk.tafel.admin.backend.common.auth.components.JwtTokenService
import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import org.springframework.web.socket.WebSocketHandler
import org.springframework.web.socket.WebSocketSession
import org.springframework.web.socket.handler.WebSocketHandlerDecorator
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.*

class TafelWebSocketCloseHandlerDecorator(
    private val tokenService: JwtTokenService,
    delegate: WebSocketHandler,
    private val timer: Timer
) : WebSocketHandlerDecorator(delegate) {

    override fun afterConnectionEstablished(session: WebSocketSession) {
        val authentication = session.principal as TafelJwtAuthentication
        val expirationDate = tokenService.getClaimsFromToken(authentication.tokenValue).expiration
        val diffInMilliseconds = ChronoUnit.MILLIS.between(Instant.now(), expirationDate.toInstant())

        timer.schedule(TafelWebSocketCloseTask(session), diffInMilliseconds)

        super.afterConnectionEstablished(session)
    }

}
