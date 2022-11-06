package at.wrk.tafel.admin.backend.config.websocket

import org.slf4j.LoggerFactory
import org.springframework.http.server.ServerHttpRequest
import org.springframework.http.server.ServerHttpResponse
import org.springframework.stereotype.Component
import org.springframework.web.socket.WebSocketHandler
import org.springframework.web.socket.server.HandshakeInterceptor

@Component
class WebSocketAuhenticationInterceptor(
    private val webSocketClientRegistry: WebSocketClientRegistry
) : HandshakeInterceptor {

    private val logger = LoggerFactory.getLogger(WebSocketAuhenticationInterceptor::class.java)

    override fun beforeHandshake(
        request: ServerHttpRequest,
        response: ServerHttpResponse,
        wsHandler: WebSocketHandler,
        attributes: MutableMap<String, Any>
    ): Boolean {
        // TODO("Not yet implemented")
        // get token
        // validate

        logger.info("BEFORE HANDSHAKE")

        return true
    }

    override fun afterHandshake(
        request: ServerHttpRequest,
        response: ServerHttpResponse,
        wsHandler: WebSocketHandler,
        exception: Exception?
    ) {
        // TODO("Not yet implemented")
        // TODO respond with client-id

        logger.info("AFTER HANDSHAKE")
    }

}
