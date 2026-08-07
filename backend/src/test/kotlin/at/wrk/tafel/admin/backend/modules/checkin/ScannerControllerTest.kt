package at.wrk.tafel.admin.backend.modules.checkin

import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxService
import at.wrk.tafel.admin.backend.modules.checkin.internal.ScannerService
import at.wrk.tafel.admin.backend.modules.checkin.internal.ScannerService.Companion.SCANNER_RESULT_NOTIFICATION_NAME
import ch.qos.logback.classic.Level
import ch.qos.logback.classic.Logger
import ch.qos.logback.classic.spi.ILoggingEvent
import ch.qos.logback.core.read.ListAppender
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.verify
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.slf4j.LoggerFactory

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
                    value = scanResult,
                ),
            )
        }
    }

    @Test
    fun `send result logs the relayed scan`() {
        val scannerId = 123
        val scanResult = 100L

        val logger = LoggerFactory.getLogger(ScannerController::class.java) as Logger
        val logAppender = ListAppender<ILoggingEvent>().apply { start() }
        logger.addAppender(logAppender)

        try {
            controller.sendResult(scannerId = scannerId, scanResult = scanResult)

            assertThat(logAppender.list).anySatisfy {
                assertThat(it.level).isEqualTo(Level.INFO)
                assertThat(it.formattedMessage).contains("Relayed scan result").contains("123").contains("100")
            }
        } finally {
            logger.detachAppender(logAppender)
        }
    }
}
