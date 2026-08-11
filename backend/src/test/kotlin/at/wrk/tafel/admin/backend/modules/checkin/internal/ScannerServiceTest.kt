package at.wrk.tafel.admin.backend.modules.checkin.internal

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.common.lock.AdvisoryLockKey
import at.wrk.tafel.admin.backend.database.common.lock.AdvisoryLockService
import at.wrk.tafel.admin.backend.database.model.checkin.ScannerRegistrationEntity
import at.wrk.tafel.admin.backend.database.model.checkin.ScannerRegistrationRepository
import io.mockk.every
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.slot
import io.mockk.verify
import io.mockk.verifySequence
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.within
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import java.time.Duration
import java.time.LocalDateTime
import java.time.temporal.ChronoUnit

@ExtendWith(MockKExtension::class)
internal class ScannerServiceTest {

    @RelaxedMockK
    private lateinit var scannerRegisteredRepository: ScannerRegistrationRepository

    @RelaxedMockK
    private lateinit var advisoryLockService: AdvisoryLockService

    private lateinit var service: ScannerService

    private val tafelAdminProperties = TafelAdminProperties()

    @BeforeEach
    fun setUp() {
        service = ScannerService(scannerRegisteredRepository, advisoryLockService, tafelAdminProperties)

        every { advisoryLockService.withLock(any(), any<() -> Any?>()) } answers {
            secondArg<() -> Any?>().invoke()
        }
    }

    @Test
    fun `register new scanner`() {
        val newScannerId = 1
        every { scannerRegisteredRepository.save(any()) } returns ScannerRegistrationEntity(
            registrationTime = LocalDateTime.now(),
            scannerId = newScannerId,
        )
        every { scannerRegisteredRepository.getNextScannerId() } returns newScannerId
        every { scannerRegisteredRepository.findByScannerId(newScannerId) } returns null

        val id = service.registerScanner()
        assertThat(id).isEqualTo(newScannerId)

        val savedEntitySlot = slot<ScannerRegistrationEntity>()
        verifySequence {
            advisoryLockService.withLock(AdvisoryLockKey.SCANNER_REGISTRATION, any<() -> Any?>())
            scannerRegisteredRepository.getNextScannerId()
            scannerRegisteredRepository.findByScannerId(newScannerId)
            scannerRegisteredRepository.save(capture(savedEntitySlot))
        }

        val savedEntity = savedEntitySlot.captured
        assertThat(savedEntity.scannerId).isEqualTo(newScannerId)
    }

    @Test
    fun `register same scanner again and id stays the same`() {
        val existingScannerId = 1
        val nextScannerId = 2
        every { scannerRegisteredRepository.getNextScannerId() } returns nextScannerId
        every { scannerRegisteredRepository.findByScannerId(existingScannerId) } returns ScannerRegistrationEntity(
            registrationTime = LocalDateTime.now().minusDays(1),
            scannerId = existingScannerId,
        )
        every { scannerRegisteredRepository.save(any()) } returns ScannerRegistrationEntity(
            registrationTime = LocalDateTime.now(),
            scannerId = existingScannerId,
        )

        val firstId = service.registerScanner(existingScannerId)
        assertThat(firstId).isEqualTo(1)

        val savedEntitySlot = slot<ScannerRegistrationEntity>()
        verifySequence {
            advisoryLockService.withLock(AdvisoryLockKey.SCANNER_REGISTRATION, any<() -> Any?>())
            scannerRegisteredRepository.getNextScannerId()
            scannerRegisteredRepository.findByScannerId(existingScannerId)
            scannerRegisteredRepository.save(capture(savedEntitySlot))
        }

        val savedEntity = savedEntitySlot.captured
        assertThat(savedEntity.scannerId).isEqualTo(existingScannerId)
        assertThat(savedEntity.registrationTime).isNotNull()
    }

    @Test
    fun `get scanner ids`() {
        every { scannerRegisteredRepository.findAll() } returns listOf(
            ScannerRegistrationEntity(registrationTime = LocalDateTime.now(), scannerId = 2),
            ScannerRegistrationEntity(registrationTime = LocalDateTime.now(), scannerId = 1),
        )

        val scannerIds = service.getScannerIds()
        assertThat(scannerIds).containsExactly(1, 2)
    }

    @Test
    fun `cleanup scanner registrations`() {
        service.cleanupScannerRegistrations()

        verify {
            scannerRegisteredRepository.deleteAllByRegistrationTimeBeforeSkipLocked(any())
        }
    }

    /**
     * The retention is configuration, not a constant - reclaiming scanner ids while a distribution
     * is running hands the scanners still in use new ones, so widening the window must not wait for
     * a restart.
     */
    @Test
    fun `cleanup removes registrations older than the configured retention`() {
        tafelAdminProperties.checkin.scannerRegistrationRetention = Duration.ofDays(7)

        service.cleanupScannerRegistrations()

        val cutoffSlot = slot<LocalDateTime>()
        verify { scannerRegisteredRepository.deleteAllByRegistrationTimeBeforeSkipLocked(capture(cutoffSlot)) }
        assertThat(cutoffSlot.captured).isCloseTo(LocalDateTime.now().minusDays(7), within(1, ChronoUnit.MINUTES))
    }
}
