package at.wrk.tafel.admin.backend.modules.checkin.internal

import at.wrk.tafel.admin.backend.database.model.checkin.ScannerRegistrationEntity
import at.wrk.tafel.admin.backend.database.model.checkin.ScannerRegistrationRepository
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime
import java.util.concurrent.TimeUnit

@Service
class ScannerService(
    private val scannerRegisteredRepository: ScannerRegistrationRepository,
) {

    companion object {
        private val logger: Logger = LoggerFactory.getLogger(ScannerService::class.java)
        private const val SCANNER_REGISTRATIONS_KEEP_DAYS = 2L
        const val SCANNER_RESULT_NOTIFICATION_NAME = "scanner_results"
    }

    @Transactional
    fun registerScanner(existingScannerId: Int? = null): Int {
        scannerRegisteredRepository.acquireLock()

        val nextScannerId = scannerRegisteredRepository.getNextScannerId()
        var scannerRegistration =
            if (existingScannerId != null) scannerRegisteredRepository.findByScannerId(existingScannerId)
            else scannerRegisteredRepository.findByScannerId(nextScannerId)

        if (scannerRegistration == null) {
            scannerRegistration = scannerRegisteredRepository.save(
                ScannerRegistrationEntity().apply {
                    registrationTime = LocalDateTime.now()
                    scannerId = nextScannerId
                }
            )
            logger.info("Registered new scanner with id: {}", nextScannerId)
        } else {
            scannerRegistration.registrationTime = LocalDateTime.now()
            scannerRegisteredRepository.save(scannerRegistration)

            logger.info("Registered existing scanner with id: {}", existingScannerId)
        }

        scannerRegisteredRepository.releaseLock()
        return scannerRegistration.scannerId!!
    }

    fun getScannerIds(): List<Int> {
        return scannerRegisteredRepository.findAll().mapNotNull { it.scannerId }.sorted()
    }

    @Scheduled(fixedDelay = 1, timeUnit = TimeUnit.HOURS)
    @Transactional
    fun cleanupScannerRegistrations() {
        val date = LocalDateTime.now().minusDays(SCANNER_REGISTRATIONS_KEEP_DAYS)
        scannerRegisteredRepository.deleteAllByRegistrationTimeBefore(date)
    }

}
