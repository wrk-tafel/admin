package at.wrk.tafel.admin.backend.modules.checkin.ticket

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import org.springframework.stereotype.Service
import java.util.stream.Collectors
import java.util.stream.IntStream

@Service
class TicketService {

    // TODO replace by infinite number sequence
    private val possibleNumbers = IntStream.range(1, 201)
        .mapToObj { TicketNumber(number = it, assigned = false) }
        .collect(Collectors.toList())

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
