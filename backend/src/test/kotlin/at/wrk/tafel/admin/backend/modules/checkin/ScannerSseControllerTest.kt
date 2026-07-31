package at.wrk.tafel.admin.backend.modules.checkin

import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxService
import at.wrk.tafel.admin.backend.modules.checkin.internal.ScannerService.Companion.SCANNER_RESULT_NOTIFICATION_NAME
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.slot
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith

@ExtendWith(MockKExtension::class)
internal class ScannerSseControllerTest {

    @RelaxedMockK
    private lateinit var sseOutboxService: SseOutboxService

    @InjectMockKs
    private lateinit var controller: ScannerSseController

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
                acceptFilter = capture(filterSlot),
            )
        }

        val filter = filterSlot.captured
        val filterResult = filter(ScanResult(scannerId = scannerId, value = customerId))
        assertThat(filterResult).isTrue
    }
}
