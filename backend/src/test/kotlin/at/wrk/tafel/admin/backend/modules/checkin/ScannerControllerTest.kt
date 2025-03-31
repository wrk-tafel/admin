package at.wrk.tafel.admin.backend.modules.checkin

import at.wrk.tafel.admin.backend.modules.checkin.internal.ScannerService
import com.fasterxml.jackson.databind.ObjectMapper
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith

@ExtendWith(MockKExtension::class)
internal class ScannerControllerTest {

    @RelaxedMockK
    private lateinit var service: ScannerService

    @RelaxedMockK
    private lateinit var objectMapper: ObjectMapper

    @InjectMockKs
    private lateinit var controller: ScannerController

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
        val scannerId = 123

        every { service.registerScanner(scannerId) } returns scannerId
        every { service.getScannerIds() } returns listOf(scannerId)

        val response = controller.registerScanner(scannerId)

        assertThat(response.scannerId).isEqualTo(scannerId)
    }

    @Test
    fun `send result`() {
        val scannerId = 123
        val scanResult = 100L

        every { service.registerScanner(scannerId) } returns scannerId
        every { service.getScannerIds() } returns listOf(scannerId)

        controller.sendResult(scannerId = scannerId, scanResult = scanResult)

        verify {
            service.saveScanResult(sentScannerId = scannerId, sentScanResult = scanResult)
        }
    }

    @Test
    fun `listen for results via SseEmitter`() {
        val scannerId = 123
        val jsonResult = "dummy-json"
        every { objectMapper.writeValueAsString(any()) } returns jsonResult

        val emitter = controller.listenForResults(scannerId = scannerId)

        val callbackSlot = slot<(Long) -> Unit>()
        verify { service.listenForResults(any(), capture(callbackSlot)) }

        callbackSlot.captured(777)

        val responseSlot = slot<ScanResult>()
        verify { objectMapper.writeValueAsString(capture(responseSlot)) }

        assertThat(responseSlot.captured).isEqualTo(ScanResult(value = 777))

        assertThat(emitter).isNotNull
    }

}
