package at.wrk.tafel.admin.backend.config

import org.springframework.context.annotation.Configuration
import org.springframework.security.config.annotation.web.messaging.MessageSecurityMetadataSourceRegistry
import org.springframework.security.config.annotation.web.socket.AbstractSecurityWebSocketMessageBrokerConfigurer

@Configuration
class WebSocketSecurityConfig : AbstractSecurityWebSocketMessageBrokerConfigurer() {

    override fun configureInbound(messages: MessageSecurityMetadataSourceRegistry) {
        // TODO set permissions
        messages.anyMessage().permitAll()
    }

    override fun sameOriginDisabled(): Boolean {
        // TODO fix
        return true
    }

}
