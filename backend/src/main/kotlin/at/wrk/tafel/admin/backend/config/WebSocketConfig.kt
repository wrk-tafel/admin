package at.wrk.tafel.admin.backend.config

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.springframework.context.annotation.Configuration
import org.springframework.messaging.simp.config.MessageBrokerRegistry
import org.springframework.security.config.annotation.web.messaging.MessageSecurityMetadataSourceRegistry
import org.springframework.security.config.annotation.web.socket.AbstractSecurityWebSocketMessageBrokerConfigurer
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker
import org.springframework.web.socket.config.annotation.StompEndpointRegistry
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer

@Configuration
@EnableWebSocketMessageBroker
@ExcludeFromTestCoverage
class WebSocketConfig : WebSocketMessageBrokerConfigurer, AbstractSecurityWebSocketMessageBrokerConfigurer() {

    override fun registerStompEndpoints(registry: StompEndpointRegistry) {
        registry.addEndpoint("/ws-api")
    }

    override fun configureMessageBroker(registry: MessageBrokerRegistry) {
        // nice explanation here for the different prefixes and channels
        // https://www.toptal.com/java/stomp-spring-boot-websocket

        registry.enableSimpleBroker(
            "/topic", // broadcasting
            "/queue" // private channel 1:1
        )

        // use /app to send messages only to the backend without forwarding to other clients
        registry.setApplicationDestinationPrefixes("/app")
    }

    override fun configureInbound(messages: MessageSecurityMetadataSourceRegistry) {
        messages.anyMessage().permitAll()
    }

    override fun sameOriginDisabled(): Boolean = true

}
