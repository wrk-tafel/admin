package at.wrk.tafel.admin.backend.config.websocket

import org.springframework.http.server.ServerHttpRequest
import org.springframework.stereotype.Component
import org.springframework.web.socket.WebSocketHandler
import org.springframework.web.socket.server.support.DefaultHandshakeHandler
import java.security.Principal

@Component
class ScannerHandshakeHandler(
    private val scannerRegistry: ScannerRegistry
) : DefaultHandshakeHandler() {

    override fun determineUser(
        request: ServerHttpRequest,
        wsHandler: WebSocketHandler,
        attributes: MutableMap<String, Any>
    ): Principal {
        return ScannerPrincipal(scannerRegistry.getNewId())
    }

}
