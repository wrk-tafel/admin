package at.wrk.tafel.admin.backend.database.model.checkin

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import java.time.LocalDateTime

/**
 * [ScannerRegistrationRepository.getNextScannerId] against a real database - a native window-
 * function query a mocked repository cannot validate.
 */
class ScannerRegistrationRepositoryIT : TafelBaseIntegrationTest() {

    @Autowired
    private lateinit var scannerRegistrationRepository: ScannerRegistrationRepository

    @AfterEach
    fun cleanup() {
        scannerRegistrationRepository.deleteAll()
    }

    @Test
    fun `returns 1 when there are no registrations at all`() {
        assertThat(scannerRegistrationRepository.getNextScannerId()).isEqualTo(1)
    }

    @Test
    fun `returns the gap between existing ids`() {
        givenScannerRegistration(1)
        givenScannerRegistration(3)

        assertThat(scannerRegistrationRepository.getNextScannerId()).isEqualTo(2)
    }

    @Test
    fun `returns max plus 1 when the existing ids are gapless`() {
        givenScannerRegistration(1)
        givenScannerRegistration(2)

        assertThat(scannerRegistrationRepository.getNextScannerId()).isEqualTo(3)
    }

    /**
     * Ids freed by the retention cleanup below the smallest id still in use must be reused too -
     * this is the gap the plain `LEAD()` window over existing rows alone cannot see, since it only
     * ever looks between rows that still exist.
     */
    @Test
    fun `reuses a freed id below the smallest id currently in use`() {
        givenScannerRegistration(5)
        givenScannerRegistration(6)

        assertThat(scannerRegistrationRepository.getNextScannerId()).isEqualTo(1)
    }

    private fun givenScannerRegistration(scannerId: Int) {
        scannerRegistrationRepository.save(
            ScannerRegistrationEntity(
                registrationTime = LocalDateTime.now(),
                scannerId = scannerId,
            ),
        )
    }
}
