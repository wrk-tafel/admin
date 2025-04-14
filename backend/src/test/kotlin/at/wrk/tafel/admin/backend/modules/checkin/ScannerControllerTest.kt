package at.wrk.tafel.admin.backend.modules.checkin

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.modules.checkin.internal.ScannerService
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.springframework.messaging.simp.SimpMessagingTemplate

@ExtendWith(MockKExtension::class)
internal class ScannerControllerTest {

    @RelaxedMockK
    private lateinit var service: ScannerService

    @RelaxedMockK
    private lateinit var messagingTemplate: SimpMessagingTemplate

    @RelaxedMockK
    private lateinit var authentication: TafelJwtAuthentication

    @InjectMockKs
    private lateinit var controller: ScannerController

    @Test
    fun `scanner registration successful`() {
        val authentication = TafelJwtAuthentication(tokenValue = "TOKEN", username = "USER")
        val id = 1
        every { service.registerScanner(authentication.username!!) } returns id

        val registration = controller.registerScanner(authentication)

        assertThat(registration.scannerId).isEqualTo(id)
    }

    @Test
    fun `get scanners`() {
        val scannerIds = listOf(1, 2, 3)
        every { service.getScannerIds() } returns scannerIds

        val response = controller.getScanners()

        assertThat(response.scannerIds).containsExactly(*scannerIds.toTypedArray())
    }

    @Test
    fun `get scanners empty`() {
        every { service.getScannerIds() } returns emptyList()

        val response = controller.getScanners()

        assertThat(response.scannerIds).isEmpty()
    }

    @Test
    fun `register scanner`() {
        val username = "USER"
        val scannerId = 123

        every { authentication.username } returns username
        every { service.registerScanner(username) } returns scannerId
        every { service.getScannerIds() } returns listOf(scannerId)

        val response = controller.registerScanner(authentication)

        assertThat(response.scannerId).isEqualTo(scannerId)
        verify { messagingTemplate.convertAndSend("/topic/scanners", ScannersResponse(scannerIds = listOf(scannerId))) }
    }

}
