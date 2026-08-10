package at.wrk.tafel.admin.backend.modules.checkin.internal

import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.common.lock.AdvisoryLockKey
import at.wrk.tafel.admin.backend.database.common.lock.AdvisoryLockService
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
    private val advisoryLockService: AdvisoryLockService,
    private val tafelAdminProperties: TafelAdminProperties,
) {

    companion object {
        private val logger: Logger = LoggerFactory.getLogger(ScannerService::class.java)
        const val SCANNER_RESULT_NOTIFICATION_NAME = "scanner_results"
    }

    /**
     * Registers a new scanner, or refreshes/re-claims an existing one.
     *
     * If [existingScannerId] is given and its registration hasn't expired yet, this is a
     * heartbeat: the registration's timestamp is refreshed and the same id is returned. If it
     * *has* expired (cleaned up by [cleanupScannerRegistrations]), the caller silently gets a
     * brand-new, possibly different id back instead of an error - callers must always use the
     * returned id, never assume they keep the one they asked for.
     *
     * Wrapped in [AdvisoryLockKey.SCANNER_REGISTRATION] because `scanner_id` is `UNIQUE NOT NULL`
     * at the DB level and [getNextScannerId][at.wrk.tafel.admin.backend.database.model.checkin.ScannerRegistrationRepository.getNextScannerId]
     * is a check-then-act gap lookup - without serializing, two concurrent registrations could
     * compute and insert the same free id.
     */
    @Transactional
    fun registerScanner(existingScannerId: Int? = null): Int = advisoryLockService.withLock(AdvisoryLockKey.SCANNER_REGISTRATION) {
        val nextScannerId = scannerRegisteredRepository.getNextScannerId()
        var scannerRegistration =
            if (existingScannerId != null) {
                scannerRegisteredRepository.findByScannerId(existingScannerId)
            } else {
                scannerRegisteredRepository.findByScannerId(nextScannerId)
            }

        if (scannerRegistration == null) {
            scannerRegistration = scannerRegisteredRepository.save(
                ScannerRegistrationEntity(
                    registrationTime = LocalDateTime.now(),
                    scannerId = nextScannerId,
                ),
            )
            logger.info("Registered new scanner with id: {}", nextScannerId)
        } else {
            scannerRegistration.registrationTime = LocalDateTime.now()
            scannerRegisteredRepository.save(scannerRegistration)

            logger.info("Registered existing scanner with id: {}", existingScannerId)
        }

        scannerRegistration.scannerId
    }

    fun getScannerIds(): List<Int> = scannerRegisteredRepository.findAll().map { it.scannerId }.sorted()

    @Scheduled(fixedDelay = 1, timeUnit = TimeUnit.HOURS)
    fun cleanupScannerRegistrations() {
        val date = LocalDateTime.now().minus(tafelAdminProperties.checkin.scannerRegistrationRetention)
        scannerRegisteredRepository.deleteAllByRegistrationTimeBefore(date)
    }
}
