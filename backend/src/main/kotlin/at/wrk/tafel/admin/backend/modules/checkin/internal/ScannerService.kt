package at.wrk.tafel.admin.backend.modules.checkin.internal

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.common.PostgresNotificationHandler
import at.wrk.tafel.admin.backend.database.model.checkin.ScannerRegistrationEntity
import at.wrk.tafel.admin.backend.database.model.checkin.ScannerRegistrationRepository
import at.wrk.tafel.admin.backend.database.model.checkin.ScannerResultEntity
import at.wrk.tafel.admin.backend.database.model.checkin.ScannerResultRepository
import com.fasterxml.jackson.annotation.JsonProperty
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
    private val scannerResultRepository: ScannerResultRepository,
    private val postgresNotificationListener: PostgresNotificationHandler,
) {

    private val logger: Logger = LoggerFactory.getLogger(ScannerService::class.java)

    // TODO cleanup scheduled ?
    // scanned_codes when time > 1 day

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

    fun listenForResults(scannerId: Int, resultsCallback: (Long) -> Unit) {
        postgresNotificationListener.startListening(
            notificationChannel = "scanner_result_inserted",
            resultType = ScannerResultNotification::class.java,
        ) { scanResult ->
            logger.info("Scanner '${scanResult.scannerId}' sent customer-id '${scanResult.customerId}'")
            resultsCallback(scanResult.customerId)
        }
    }

    @Transactional
    fun saveScanResult(sentScannerId: Int, sentScanResult: Long) {
        val result = ScannerResultEntity().apply {
            scanTime = LocalDateTime.now()
            scannerId = sentScannerId
            customerId = sentScanResult
        }
        scannerResultRepository.save(result)
    }

    @Scheduled(fixedDelay = 1, timeUnit = TimeUnit.HOURS)
    @Transactional
    fun cleanupScanResults() {
        val date = LocalDateTime.now().minusDays(5)
        scannerResultRepository.deleteAllByScanTimeBefore(date)
    }

}

@ExcludeFromTestCoverage
data class ScannerResultNotification(
    @JsonProperty("id") val id: Long,
    @JsonProperty("scan_time") val scanTime: LocalDateTime,
    @JsonProperty("scanner_id") val scannerId: Int,
    @JsonProperty("customer_id") val customerId: Long,
)
