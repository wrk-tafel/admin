package at.wrk.tafel.admin.backend.config.websocket

import org.springframework.stereotype.Component
import java.util.concurrent.atomic.AtomicInteger

@Component
class ScannerRegistry {

    private val scannerCount = AtomicInteger(0)
    private val scannerIdList = mutableListOf<Int>()

    fun getNewId(): Int {
        val newId = scannerCount.incrementAndGet()
        scannerIdList.add(newId)
        return newId
    }

    fun removeScanner(clientId: Int) {
        scannerIdList.remove(clientId)
    }

}
