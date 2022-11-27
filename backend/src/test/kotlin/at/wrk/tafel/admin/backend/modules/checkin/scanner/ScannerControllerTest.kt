package at.wrk.tafel.admin.backend.modules.checkin.scanner

import org.junit.jupiter.api.Test

internal class ScannerControllerTest {

    private val controller = ScannerController()

    @Test
    fun `retrieve scanresult`() {
        val testResult = ScanResult(value = "test123")

        controller.retrieveScanResult(testResult)

        // TODO add asserts
    }

}
