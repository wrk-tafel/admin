package at.wrk.tafel.admin.backend.common.auth.websocket

import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.web.socket.CloseStatus
import org.springframework.web.socket.WebSocketSession

@ExtendWith(MockKExtension::class)
internal class TafelWebSocketCloseTaskTest {

    @RelaxedMockK
    private lateinit var session: WebSocketSession

    @InjectMockKs
    private lateinit var task: TafelWebSocketCloseTask

    @Test
    fun `session closed properly`() {
        task.run()

        verify { session.close(CloseStatus.PROTOCOL_ERROR) }
    }

}
