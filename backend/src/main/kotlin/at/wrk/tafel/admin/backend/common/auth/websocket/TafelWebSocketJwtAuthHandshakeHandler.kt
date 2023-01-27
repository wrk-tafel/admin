package at.wrk.tafel.admin.backend.common.auth.websocket

import at.wrk.tafel.admin.backend.common.auth.components.TafelJwtAuthConverter
import at.wrk.tafel.admin.backend.common.auth.components.TafelJwtAuthProvider
import org.springframework.http.server.ServerHttpRequest
import org.springframework.http.server.ServerHttpResponse
import org.springframework.http.server.ServletServerHttpRequest
import org.springframework.messaging.simp.SimpMessageHeaderAccessor
import org.springframework.web.socket.WebSocketHandler
import org.springframework.web.socket.server.HandshakeInterceptor

class TafelWebSocketJwtAuthHandshakeHandler(
    private val authConverter: TafelJwtAuthConverter,
    private val authProvider: TafelJwtAuthProvider
) : HandshakeInterceptor {

    override fun beforeHandshake(
        request: ServerHttpRequest,
        response: ServerHttpResponse,
        wsHandler: WebSocketHandler,
        attributes: MutableMap<String, Any>
    ): Boolean {
        val servletRequest = (request as ServletServerHttpRequest).servletRequest
        val authentication = authConverter.convert(servletRequest)

        return authentication?.let {
            val authenticationResult = authProvider.authenticate(it)
            attributes[SimpMessageHeaderAccessor.USER_HEADER] = authenticationResult
            return authenticationResult.isAuthenticated
        } ?: false
    }

    override fun afterHandshake(
        request: ServerHttpRequest,
        response: ServerHttpResponse,
        wsHandler: WebSocketHandler,
        exception: Exception?
    ) {
    }

}
