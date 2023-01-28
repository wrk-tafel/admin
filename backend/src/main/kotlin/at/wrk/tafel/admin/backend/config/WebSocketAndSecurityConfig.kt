package at.wrk.tafel.admin.backend.config

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.auth.components.JwtTokenService
import at.wrk.tafel.admin.backend.common.auth.components.TafelJwtAuthConverter
import at.wrk.tafel.admin.backend.common.auth.components.TafelJwtAuthProvider
import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.common.auth.websocket.TafelWebSocketJwtAuthHandshakeHandler
import at.wrk.tafel.admin.backend.common.auth.websocket.TafelWebSocketJwtAuthInterceptor
import org.springframework.context.ApplicationContext
import org.springframework.context.annotation.Configuration
import org.springframework.messaging.Message
import org.springframework.messaging.handler.invocation.HandlerMethodArgumentResolver
import org.springframework.messaging.simp.config.ChannelRegistration
import org.springframework.messaging.simp.config.MessageBrokerRegistry
import org.springframework.messaging.simp.stomp.StompHeaderAccessor
import org.springframework.security.authorization.AuthorizationEventPublisher
import org.springframework.security.authorization.AuthorizationManager
import org.springframework.security.authorization.SpringAuthorizationEventPublisher
import org.springframework.security.messaging.access.intercept.AuthorizationChannelInterceptor
import org.springframework.security.messaging.access.intercept.MessageMatcherDelegatingAuthorizationManager
import org.springframework.security.messaging.context.AuthenticationPrincipalArgumentResolver
import org.springframework.security.messaging.context.SecurityContextChannelInterceptor
import org.springframework.web.socket.CloseStatus
import org.springframework.web.socket.WebSocketSession
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker
import org.springframework.web.socket.config.annotation.StompEndpointRegistry
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer
import org.springframework.web.socket.config.annotation.WebSocketTransportRegistration
import org.springframework.web.socket.handler.WebSocketHandlerDecorator
import java.time.Instant
import java.time.temporal.ChronoUnit
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
            .addInterceptors(
                TafelWebSocketJwtAuthHandshakeHandler(authConverter, authProvider)
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

        // TODO registry.setUserDestinationPrefix("/client")
    }

    fun messageAuthorizationManager(messages: MessageMatcherDelegatingAuthorizationManager.Builder): AuthorizationManager<Message<*>?>? {
        return messages
            .simpSubscribeDestMatchers("/topic/scanners/**").hasAuthority("SCANNER")
            .simpDestMatchers("/scanners/**").hasAuthority("SCANNER")
            .anyMessage().authenticated()
            .build()
    }

    override fun addArgumentResolvers(argumentResolvers: MutableList<HandlerMethodArgumentResolver>) {
        argumentResolvers.add(AuthenticationPrincipalArgumentResolver())
    }

    override fun configureClientInboundChannel(registration: ChannelRegistration) {
        val myAuthorizationRules = messageAuthorizationManager(MessageMatcherDelegatingAuthorizationManager.Builder())
        val authz = AuthorizationChannelInterceptor(myAuthorizationRules)

        val publisher: AuthorizationEventPublisher = SpringAuthorizationEventPublisher(applicationContext)
        authz.setAuthorizationEventPublisher(publisher)

        registration.interceptors(
            TafelWebSocketJwtAuthInterceptor(),
            SecurityContextChannelInterceptor(),
            authz
        )
    }

    override fun configureWebSocketTransport(registry: WebSocketTransportRegistration) {
        registry.addDecoratorFactory { handler ->
            object : WebSocketHandlerDecorator(handler) {
                override fun afterConnectionEstablished(session: WebSocketSession) {
                    val authentication = session.attributes[StompHeaderAccessor.USER_HEADER] as TafelJwtAuthentication
                    val expirationDate = tokenService.getClaimsFromToken(authentication.tokenValue).expiration
                    val diffInMilliseconds = ChronoUnit.MILLIS.between(Instant.now(), expirationDate.toInstant())

                    Timer().schedule(object : TimerTask() {
                        override fun run() {
                            session.close(CloseStatus.PROTOCOL_ERROR)
                        }
                    }, diffInMilliseconds)

                    super.afterConnectionEstablished(session)
                }
            }
        }
    }

}
