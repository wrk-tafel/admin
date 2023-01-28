package at.wrk.tafel.admin.backend.common.auth.websocket

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import org.springframework.messaging.Message
import org.springframework.messaging.MessageChannel
import org.springframework.messaging.simp.SimpMessageHeaderAccessor
import org.springframework.messaging.simp.stomp.StompHeaderAccessor
import org.springframework.messaging.support.ChannelInterceptor
import org.springframework.messaging.support.MessageBuilder

class TafelWebSocketJwtAuthInterceptor : ChannelInterceptor {

    override fun preSend(message: Message<*>, channel: MessageChannel): Message<*>? {
        return setAuthenticationAsHeader(message)
    }

    private fun setAuthenticationAsHeader(message: Message<*>): Message<*> {
        val accessor = StompHeaderAccessor.wrap(message)
        val authentication =
            accessor.sessionAttributes?.get(SimpMessageHeaderAccessor.USER_HEADER) as TafelJwtAuthentication
        accessor.user = authentication
        accessor.setLeaveMutable(true)
        return MessageBuilder.createMessage(message.payload, accessor.messageHeaders)
    }

}
