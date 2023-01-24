package at.wrk.tafel.admin.backend.config

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.springframework.context.annotation.Configuration
import org.springframework.messaging.simp.config.MessageBrokerRegistry
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker
import org.springframework.web.socket.config.annotation.StompEndpointRegistry
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer

@Configuration
@EnableWebSocketMessageBroker
@ExcludeFromTestCoverage
class WebSocketAndSecurityConfig : WebSocketMessageBrokerConfigurer {

    override fun registerStompEndpoints(registry: StompEndpointRegistry) {
        registry.addEndpoint("/api/websockets")
            // TODO same-origin should be used (probably only possible with sockjs) while documentation mentions this to be default also without sockjs
            // TODO while with enabled authentication and the strict cookie it should be also safe to have cors disabled
            .setAllowedOrigins("*")
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
