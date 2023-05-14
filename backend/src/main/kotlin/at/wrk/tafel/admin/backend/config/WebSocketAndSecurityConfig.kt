package at.wrk.tafel.admin.backend.config

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.auth.components.JwtTokenService
import at.wrk.tafel.admin.backend.common.auth.components.TafelJwtAuthConverter
import at.wrk.tafel.admin.backend.common.auth.components.TafelJwtAuthProvider
import at.wrk.tafel.admin.backend.common.auth.websocket.TafelWebSocketCloseHandlerDecorator
import at.wrk.tafel.admin.backend.common.auth.websocket.TafelWebSocketJwtAuthHandshakeHandler
import org.springframework.context.ApplicationContext
import org.springframework.context.annotation.Configuration
import org.springframework.messaging.Message
import org.springframework.messaging.simp.SimpMessageType
import org.springframework.messaging.simp.config.ChannelRegistration
import org.springframework.messaging.simp.config.MessageBrokerRegistry
import org.springframework.security.authorization.AuthorizationEventPublisher
import org.springframework.security.authorization.AuthorizationManager
import org.springframework.security.authorization.SpringAuthorizationEventPublisher
import org.springframework.security.messaging.access.intercept.AuthorizationChannelInterceptor
import org.springframework.security.messaging.access.intercept.MessageMatcherDelegatingAuthorizationManager
import org.springframework.security.messaging.context.SecurityContextChannelInterceptor
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker
import org.springframework.web.socket.config.annotation.StompEndpointRegistry
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer
import org.springframework.web.socket.config.annotation.WebSocketTransportRegistration
import java.util.*

@Configuration
@EnableWebSocketMessageBroker
@ExcludeFromTestCoverage
class WebSocketAndSecurityConfig(
    private val authConverter: TafelJwtAuthConverter,
    private val authProvider: TafelJwtAuthProvider,
    private val applicationContext: ApplicationContext,
    private val tokenService: JwtTokenService
) : WebSocketMessageBrokerConfigurer {

    override fun registerStompEndpoints(registry: StompEndpointRegistry) {
        registry.addEndpoint("/api/websockets")
            // TODO same-origin should be used (probably sockjs is necessary for that) while documentation mentions this to be default also without sockjs
            // TODO while with enabled authentication and the SameSite strict cookie it should be also safe to have cors disabled
            .setAllowedOrigins("*")
            .setHandshakeHandler(
                TafelWebSocketJwtAuthHandshakeHandler(authConverter, authProvider)
            )
    }

    override fun configureMessageBroker(registry: MessageBrokerRegistry) {
        // Nice explanation for the different prefixes and channels
        // https://www.toptal.com/java/stomp-spring-boot-websocket
        // https://docs.spring.io/spring-framework/docs/current/reference/html/web.html#websocket-stomp-message-flow

        registry.enableSimpleBroker(
            "/topic", // broadcasting
            "/queue" // private channel 1:1
        )

        // prefixes /app and /topic will be forwarded to controllers for Message/Subscribe-Mapping
        registry.setApplicationDestinationPrefixes("/app", "/topic")

        registry.setUserDestinationPrefix("/user")
    }

    fun messageAuthorizationManager(messages: MessageMatcherDelegatingAuthorizationManager.Builder): AuthorizationManager<Message<*>?>? {
        return messages
            .simpDestMatchers("/app/scanners/**", "/user/queue/scanners/**").hasAuthority("SCANNER")
            .simpDestMatchers("/topic/scanners/**").hasAnyAuthority("SCANNER", "CHECKIN")
            .simpDestMatchers("/topic/ticket-screen/**").hasAuthority("CHECKIN")
            .simpTypeMatchers(SimpMessageType.CONNECT).authenticated()
            .simpTypeMatchers(SimpMessageType.DISCONNECT).permitAll()
            .anyMessage().authenticated()
            .build()
    }

    override fun configureClientInboundChannel(registration: ChannelRegistration) {
        val myAuthorizationRules = messageAuthorizationManager(MessageMatcherDelegatingAuthorizationManager.Builder())
        val authz = AuthorizationChannelInterceptor(myAuthorizationRules)

        val publisher: AuthorizationEventPublisher = SpringAuthorizationEventPublisher(applicationContext)
        authz.setAuthorizationEventPublisher(publisher)

        registration.interceptors(
            SecurityContextChannelInterceptor(),
            authz
        )
    }

    override fun configureWebSocketTransport(registry: WebSocketTransportRegistration) {
        registry.addDecoratorFactory { handler ->
            TafelWebSocketCloseHandlerDecorator(
                tokenService = tokenService,
                delegate = handler,
                timer = Timer()
            )
        }
    }

}
