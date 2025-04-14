package at.wrk.tafel.admin.backend.modules.checkin

import at.wrk.tafel.admin.backend.database.common.sse_outbox.SseOutboxService
import at.wrk.tafel.admin.backend.modules.checkin.internal.ScannerService
import at.wrk.tafel.admin.backend.modules.checkin.internal.ScannerService.Companion.SCANNER_RESULT_NOTIFICATION_NAME
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
    private lateinit var sseOutboxService: SseOutboxService

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
            sseOutboxService.saveOutboxEntry(
                notificationName = SCANNER_RESULT_NOTIFICATION_NAME,
                payload = ScanResult(
                    scannerId = scannerId,
                    value = scanResult
                )
            )
        }
    }

    @Test
    fun `listen for results matching scannerId`() {
        val scannerId = 123
        val customerId = 777L

        val sseEmitter = controller.listenForResults(scannerId = scannerId)
        assertThat(sseEmitter).isNotNull

        val filterSlot = slot<(ScanResult?) -> Boolean>()
        verify {
            sseOutboxService.forwardNotificationEventsToSse(
                sseEmitter = any(),
                notificationName = SCANNER_RESULT_NOTIFICATION_NAME,
                resultType = ScanResult::class.java,
                acceptFilter = capture(filterSlot)
            )
        }

        val filter = filterSlot.captured
        val filterResult = filter(ScanResult(scannerId = scannerId, value = customerId))
        assertThat(filterResult).isTrue
    }

}
