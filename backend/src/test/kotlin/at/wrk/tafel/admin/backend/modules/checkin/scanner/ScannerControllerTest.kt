package at.wrk.tafel.admin.backend.modules.checkin.scanner

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith

@ExtendWith(MockKExtension::class)
internal class ScannerControllerTest {

    @RelaxedMockK
    private lateinit var service: ScannerService

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
    fun `retrieve scan result`() {
        val result = ScanResult(value = "12345")

        controller.retrieveScanResult(result)

        // TODO extend
    }

    @Test
    fun `get scanners`() {
        val scannerIds = listOf(1, 2, 3)
        every { service.getScannerIds() } returns scannerIds

        val response = controller.getScannerIds()

        assertThat(response.scannerIds).containsExactly(*scannerIds.toTypedArray())
    }

    @Test
    fun `get scanners empty`() {
        every { service.getScannerIds() } returns emptyList()

        val response = controller.getScannerIds()

        assertThat(response.scannerIds).isEmpty()
    }

}
