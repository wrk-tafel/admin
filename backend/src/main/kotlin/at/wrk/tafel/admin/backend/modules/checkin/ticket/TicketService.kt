package at.wrk.tafel.admin.backend.modules.checkin.ticket

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.repositories.checkin.TicketNumberRepository
import org.springframework.stereotype.Service

@Service
class TicketService(
    ticketNumberRepository: TicketNumberRepository
) {

    private val possibleNumbers =
        ticketNumberRepository.findAll().map { TicketNumber(number = it.number!!, granted = false) }

    fun getNextTicket(): Int? {
        synchronized(this) {
            val nextNumber = possibleNumbers.firstOrNull { !it.granted }
            if (nextNumber != null) {
                nextNumber.granted = true
                return nextNumber.number
            }
            return null
        }
    }

}

@ExcludeFromTestCoverage
data class TicketNumber(
    val number: Int,
    var granted: Boolean
)
