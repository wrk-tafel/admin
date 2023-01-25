package at.wrk.tafel.admin.backend.config

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.auth.components.TafelJwtAuthConverter
import at.wrk.tafel.admin.backend.common.auth.components.TafelJwtAuthProvider
import at.wrk.tafel.admin.backend.common.auth.websocket.TafelWSJwtAuthHandshakeHandler
import org.springframework.context.annotation.Configuration
import org.springframework.messaging.simp.config.MessageBrokerRegistry
import org.springframework.web.socket.config.annotation.*

@Configuration
@EnableWebSocketMessageBroker
@ExcludeFromTestCoverage
class WebSocketAndSecurityConfig(
    private val authConverter: TafelJwtAuthConverter,
    private val authProvider: TafelJwtAuthProvider
) : WebSocketMessageBrokerConfigurer {

    override fun registerStompEndpoints(registry: StompEndpointRegistry) {
        registry.addEndpoint("/api/websockets")
            // TODO same-origin should be used (probably sockjs is necessary for that) while documentation mentions this to be default also without sockjs
            // TODO while with enabled authentication and the SameSite strict cookie it should be also safe to have cors disabled
            .setAllowedOrigins("*")
            .addInterceptors(
                TafelWSJwtAuthHandshakeHandler(authConverter, authProvider)
            )
    }

    override fun configureMessageBroker(registry: MessageBrokerRegistry) {
        // Nice explanation for the different prefixes and channels
        // https://www.toptal.com/java/stomp-spring-boot-websocket

        registry.enableSimpleBroker(
            "/topic", // broadcasting
            "/queue" // private channel 1:1
        )

        // use /app to send messages only to the backend without forwarding to other clients
        registry.setApplicationDestinationPrefixes("/app")
    }

}
