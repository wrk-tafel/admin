package at.wrk.tafel.admin.backend.modules.base.security.websocket

import at.wrk.tafel.admin.backend.modules.base.security.components.TafelJwtAuthConverter
import at.wrk.tafel.admin.backend.modules.base.security.components.TafelJwtAuthProvider
import org.springframework.http.server.ServerHttpRequest
import org.springframework.http.server.ServletServerHttpRequest
import org.springframework.web.socket.WebSocketHandler
import org.springframework.web.socket.server.support.DefaultHandshakeHandler
import java.security.Principal

class TafelWebSocketJwtAuthHandshakeHandler(
    private val authConverter: TafelJwtAuthConverter,
    private val authProvider: TafelJwtAuthProvider
) : DefaultHandshakeHandler() {

    public override fun determineUser(
        request: ServerHttpRequest,
        wsHandler: WebSocketHandler,
        attributes: MutableMap<String, Any>
    ): Principal? {
        try {
            val servletRequest = (request as ServletServerHttpRequest).servletRequest
            val authentication = authConverter.convert(servletRequest)

            return authentication?.let {
                return authProvider.authenticate(it)
            }
        } catch (e: Exception) {
            return null
        }
    }

}
