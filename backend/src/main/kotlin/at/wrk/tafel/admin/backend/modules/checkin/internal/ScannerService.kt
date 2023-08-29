package at.wrk.tafel.admin.backend.modules.checkin.internal

import org.slf4j.Logger
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ConcurrentMap
import java.util.concurrent.atomic.AtomicInteger

@Service
class ScannerService {

    private val logger: Logger = LoggerFactory.getLogger(ScannerService::class.java)

    private val registrationMap: ConcurrentMap<String, Int> = ConcurrentHashMap()
    private val registeredClientsCount: AtomicInteger = AtomicInteger()

    fun registerScanner(username: String): Int {
        var id = registrationMap[username]
        if (id == null) {
            id = registeredClientsCount.incrementAndGet()
            registrationMap[username] = id
            logger.info("Scanner logged in as user $username registered with ID: $id")
        } else {
            logger.info("Scanner logged in as user $username re-assigned to ID: $id")
        }
        return id
    }

    fun getScannerIds(): List<Int> {
        return registrationMap.values.toList().sorted()
    }

}
