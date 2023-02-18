package at.wrk.tafel.admin.backend.modules.checkin.ticket

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.repositories.checkin.TicketNumberRepository
import jakarta.annotation.PostConstruct
import org.springframework.stereotype.Service

@Service
class TicketService(
    private val ticketNumberRepository: TicketNumberRepository
) {

    private val possibleNumbers = ArrayList<TicketNumber>()

    @PostConstruct
    fun init() {
        possibleNumbers.addAll(
            ticketNumberRepository.findAll().map { TicketNumber(number = it.number!!, assigned = false) }
        )
    }

    fun getNextTicket(): Int? {
        synchronized(this) {
            val nextNumber = possibleNumbers.firstOrNull { !it.assigned }
            if (nextNumber != null) {
                nextNumber.assigned = true
                return nextNumber.number
            }
            return null
        }
    }

}

@ExcludeFromTestCoverage
data class TicketNumber(
    val number: Int,
    var assigned: Boolean
)
