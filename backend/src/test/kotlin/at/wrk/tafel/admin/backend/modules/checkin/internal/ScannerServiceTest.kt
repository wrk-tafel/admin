package at.wrk.tafel.admin.backend.modules.checkin.internal

import at.wrk.tafel.admin.backend.database.model.checkin.ScannerRegistrationEntity
import at.wrk.tafel.admin.backend.database.model.checkin.ScannerRegistrationRepository
import io.mockk.every
import io.mockk.impl.annotations.InjectMockKs
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import io.mockk.slot
import io.mockk.verify
import io.mockk.verifySequence
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import java.time.LocalDateTime

@ExtendWith(MockKExtension::class)
internal class ScannerServiceTest {

    @RelaxedMockK
    private lateinit var scannerRegisteredRepository: ScannerRegistrationRepository

    @InjectMockKs
    private lateinit var service: ScannerService

    @Test
    fun `register new scanner`() {
        val newScannerId = 1
        every { scannerRegisteredRepository.save(any()) } returns ScannerRegistrationEntity().apply {
            registrationTime = LocalDateTime.now()
            scannerId = newScannerId
        }
        every { scannerRegisteredRepository.getNextScannerId() } returns newScannerId
        every { scannerRegisteredRepository.findByScannerId(newScannerId) } returns null

        val id = service.registerScanner()
        assertThat(id).isEqualTo(newScannerId)

        val savedEntitySlot = slot<ScannerRegistrationEntity>()
        verifySequence {
            scannerRegisteredRepository.acquireLock()
            scannerRegisteredRepository.getNextScannerId()
            scannerRegisteredRepository.findByScannerId(newScannerId)
            scannerRegisteredRepository.save(capture(savedEntitySlot))
            scannerRegisteredRepository.releaseLock()
        }

        val savedEntity = savedEntitySlot.captured
        assertThat(savedEntity.scannerId).isEqualTo(newScannerId)
    }

    @Test
    fun `register same scanner again and id stays the same`() {
        val existingScannerId = 1
        val nextScannerId = 2
        every { scannerRegisteredRepository.getNextScannerId() } returns nextScannerId
        every { scannerRegisteredRepository.findByScannerId(existingScannerId) } returns ScannerRegistrationEntity().apply {
            registrationTime = null
            scannerId = existingScannerId
        }
        every { scannerRegisteredRepository.save(any()) } returns ScannerRegistrationEntity().apply {
            registrationTime = LocalDateTime.now()
            scannerId = existingScannerId
        }

        val firstId = service.registerScanner(existingScannerId)
        assertThat(firstId).isEqualTo(1)

        val savedEntitySlot = slot<ScannerRegistrationEntity>()
        verifySequence {
            scannerRegisteredRepository.acquireLock()
            scannerRegisteredRepository.getNextScannerId()
            scannerRegisteredRepository.findByScannerId(existingScannerId)
            scannerRegisteredRepository.save(capture(savedEntitySlot))
            scannerRegisteredRepository.releaseLock()
        }

        val savedEntity = savedEntitySlot.captured
        assertThat(savedEntity.scannerId).isEqualTo(existingScannerId)
        assertThat(savedEntity.registrationTime).isNotNull()
    }

    @Test
    fun `get scanner ids`() {
        every { scannerRegisteredRepository.findAll() } returns listOf(
            ScannerRegistrationEntity().apply {
                registrationTime = LocalDateTime.now()
                scannerId = 2
            },
            ScannerRegistrationEntity().apply {
                registrationTime = LocalDateTime.now()
                scannerId = 1
            }
        )

        val scannerIds = service.getScannerIds()
        assertThat(scannerIds).containsExactly(1, 2)
    }

    @Test
    fun `cleanup scanner registrations`() {
        service.cleanupScannerRegistrations()

        verify {
            scannerRegisteredRepository.deleteAllByRegistrationTimeBefore(any())
        }
    }

}
