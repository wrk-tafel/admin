package at.wrk.tafel.admin.backend.config

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.springframework.context.ApplicationContext
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.messaging.Message
import org.springframework.messaging.handler.invocation.HandlerMethodArgumentResolver
import org.springframework.messaging.simp.config.ChannelRegistration
import org.springframework.messaging.simp.config.MessageBrokerRegistry
import org.springframework.security.authorization.AuthenticatedAuthorizationManager
import org.springframework.security.authorization.AuthorizationEventPublisher
import org.springframework.security.authorization.AuthorizationManager
import org.springframework.security.authorization.SpringAuthorizationEventPublisher
import org.springframework.security.config.annotation.web.socket.EnableWebSocketSecurity
import org.springframework.security.messaging.access.intercept.AuthorizationChannelInterceptor
import org.springframework.security.messaging.access.intercept.MessageMatcherDelegatingAuthorizationManager
import org.springframework.security.messaging.context.AuthenticationPrincipalArgumentResolver
import org.springframework.security.messaging.context.SecurityContextChannelInterceptor
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker
import org.springframework.web.socket.config.annotation.StompEndpointRegistry
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer

@Configuration
@EnableWebSocketMessageBroker
@EnableWebSocketSecurity
@ExcludeFromTestCoverage
class WebSocketAndSecurityConfig(
    private val applicationContext: ApplicationContext
) : WebSocketMessageBrokerConfigurer {

    override fun registerStompEndpoints(registry: StompEndpointRegistry) {
        registry.addEndpoint("/api/websockets").setAllowedOrigins("*")
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

    override fun addArgumentResolvers(argumentResolvers: MutableList<HandlerMethodArgumentResolver?>) {
        argumentResolvers.add(AuthenticationPrincipalArgumentResolver())
    }

    override fun configureClientInboundChannel(registration: ChannelRegistration) {
        val authzManager = authorizationManager(MessageMatcherDelegatingAuthorizationManager.Builder())
        val authz = AuthorizationChannelInterceptor(authzManager)
        val publisher: AuthorizationEventPublisher = SpringAuthorizationEventPublisher(applicationContext)
        authz.setAuthorizationEventPublisher(publisher)
        registration.interceptors(SecurityContextChannelInterceptor(), authz)
    }

    @Bean
    fun authorizationManager(messages: MessageMatcherDelegatingAuthorizationManager.Builder): AuthorizationManager<Message<*>> {
        messages.anyMessage().hasAuthority("CUSTOMER")

        return messages.build()
    }

}
