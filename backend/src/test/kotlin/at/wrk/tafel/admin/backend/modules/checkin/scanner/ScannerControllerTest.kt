package at.wrk.tafel.admin.backend.modules.checkin.scanner

import io.mockk.junit5.MockKExtension
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith

@ExtendWith(MockKExtension::class)
internal class ScannerControllerTest {

    private lateinit var controller: ScannerController

    @Test
    fun `retrieve scanresult`() {
        val testResult = ScanResult(value = "test123")

        controller.retrieveScanResult(testResult)

        // TODO add asserts
    }

}
