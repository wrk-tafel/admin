package at.wrk.tafel.admin.backend.config

import at.wrk.tafel.admin.backend.config.websocket.WebSocketAuhenticationInterceptor
import at.wrk.tafel.admin.backend.modules.enrollment.scanner.ScannerWebSocketHandler
import org.springframework.context.annotation.Configuration
import org.springframework.web.socket.config.annotation.EnableWebSocket
import org.springframework.web.socket.config.annotation.WebSocketConfigurer
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry

@Configuration
@EnableWebSocket
class WebSocketConfig(
    private val webSocketAuhenticationInterceptor: WebSocketAuhenticationInterceptor,
    private val scannerWebSocketHandler: ScannerWebSocketHandler
) : WebSocketConfigurer {

    override fun registerWebSocketHandlers(registry: WebSocketHandlerRegistry) {
        registry.addHandler(scannerWebSocketHandler, "/ws-api/scanners")
            .addInterceptors(webSocketAuhenticationInterceptor)
    }

}
