package at.wrk.tafel.admin.backend.common.auth.websocket

import at.wrk.tafel.admin.backend.common.auth.components.TafelJwtAuthConverter
import at.wrk.tafel.admin.backend.common.auth.components.TafelJwtAuthProvider
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith

@ExtendWith(MockKExtension::class)
internal class TafelWSJwtAuthHandshakeHandlerTest {

    @RelaxedMockK
    private lateinit var authConverter: TafelJwtAuthConverter

    @RelaxedMockK
    private lateinit var authProvider: TafelJwtAuthProvider

    @InjectMockKs
    private lateinit var handler: TafelWSJwtAuthHandshakeHandler

    @Test
    fun test() {
        TODO("IMPL")
    }

}
