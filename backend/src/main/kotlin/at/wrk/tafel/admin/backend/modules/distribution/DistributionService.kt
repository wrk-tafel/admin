package at.wrk.tafel.admin.backend.modules.distribution

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.common.model.DistributionState
import at.wrk.tafel.admin.backend.common.pdf.PDFService
import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionCustomerEntity
import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.repositories.auth.UserRepository
import at.wrk.tafel.admin.backend.database.repositories.customer.CustomerRepository
import at.wrk.tafel.admin.backend.database.repositories.distribution.DistributionCustomerRepository
import at.wrk.tafel.admin.backend.database.repositories.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import at.wrk.tafel.admin.backend.modules.distribution.model.CustomerListItem
import at.wrk.tafel.admin.backend.modules.distribution.model.CustomerListPdfModel
import at.wrk.tafel.admin.backend.modules.distribution.model.CustomerListPdfResult
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Service
import java.time.LocalDate
import java.time.Period
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

@Service
class DistributionService(
    private val distributionRepository: DistributionRepository,
    private val userRepository: UserRepository,
    private val distributionCustomerRepository: DistributionCustomerRepository,
    private val customerRepository: CustomerRepository,
    private val pdfService: PDFService
) {
    companion object {
        private val STATES_LIST = listOf(
            DistributionState.OPEN,
            DistributionState.CHECKIN,
            DistributionState.PAUSE,
            DistributionState.DISTRIBUTION,
            DistributionState.CLOSED
        )
        private val DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
    }

    fun createNewDistribution(): DistributionEntity {
        val currentDistribution = distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc()
        if (currentDistribution != null) {
            throw TafelValidationException("Ausgabe bereits gestartet!")
        }

        val authenticatedUser = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication

        val distribution = DistributionEntity()
        distribution.startedAt = ZonedDateTime.now()
        distribution.startedByUser = userRepository.findByUsername(authenticatedUser.username!!).get()
        distribution.state = DistributionState.OPEN

        return distributionRepository.save(distribution)
    }

    fun getCurrentDistribution(): DistributionEntity? {
        return distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc()
    }

    fun getStates(): List<DistributionState> {
        return STATES_LIST
    }

    fun switchToNextState(currentState: DistributionState) {
        val nextState = STATES_LIST[STATES_LIST.indexOf(currentState) + 1]
        saveStateToDistribution(nextState)
    }

    fun assignCustomerToDistribution(distribution: DistributionEntity, customerId: Long, ticketNumber: Int) {
        val customer = customerRepository.findByCustomerId(customerId)
            ?: throw TafelValidationException("Kunde Nr. $customerId nicht vorhanden!")

        val entry = DistributionCustomerEntity()
        entry.distribution = distribution
        entry.customer = customer
        entry.ticketNumber = ticketNumber
        entry.processed = false

        try {
            distributionCustomerRepository.save(entry)
        } catch (e: DataIntegrityViolationException) {
            throw TafelValidationException("Kunde oder Ticketnummer wurde bereits zugewiesen!")
        }
    }

    fun generateCustomerListPdf(): CustomerListPdfResult? {
        val currentDistribution = distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc()
            ?: throw TafelValidationException("Ausgabe nicht gestartet!")

        val formattedDate = DATE_FORMATTER.format(currentDistribution?.startedAt)
        val sortedCustomers = currentDistribution.customers.sortedBy { it.ticketNumber }

        val halftimeIndex = sortedCustomers.size.div(2)
        val halftimeTicketNumber = if (sortedCustomers.size > 2) sortedCustomers[halftimeIndex].ticketNumber!! else null
        val data = CustomerListPdfModel(
            title = "Kundenliste zur Ausgabe vom $formattedDate",
            halftimeTicketNumber = halftimeTicketNumber,
            customers = mapCustomers(sortedCustomers)
        )

        val bytes = pdfService.generatePdf(data, "/pdf-templates/distribution-customerlist/customerlist.xsl")
        val filename = "kundenliste-ausgabe-$formattedDate.pdf"
        return CustomerListPdfResult(filename = filename, bytes = bytes)
    }

    fun getCurrentTicket(distribution: DistributionEntity, customerId: Long? = null): Int? {
        return distribution.customers
            .asSequence()
            .filter { customerId == null || it.customer?.customerId == customerId }
            .filter { it.processed == false }
            .sortedBy { it.ticketNumber }
            .map { it.ticketNumber }
            .firstOrNull()
    }

    fun closeCurrentTicketAndGetNext(distribution: DistributionEntity): Int? {
        val currentTicket = getCurrentTicket(distribution)

        val currentTicketEntry = distribution.customers.firstOrNull { it.ticketNumber == currentTicket }
        if (currentTicketEntry != null) {
            currentTicketEntry.processed = true
            distributionCustomerRepository.save(currentTicketEntry)

            return getCurrentTicket(distribution)
        }

        return null
    }

    private fun mapCustomers(customers: List<DistributionCustomerEntity>): List<CustomerListItem> {
        return customers.map { distributionCustomerEntity ->
            val customer = distributionCustomerEntity.customer

            CustomerListItem(
                ticketNumber = distributionCustomerEntity.ticketNumber!!,
                customerId = customer?.customerId!!,
                name = "${customer?.lastname} ${customer?.firstname}",
                countPersons = customer?.additionalPersons?.size?.plus(1) ?: 0,
                countInfants = customer?.additionalPersons?.count {
                    Period.between(it.birthDate, LocalDate.now()).years < 3
                } ?: 0
            )
        }
    }

    private fun saveStateToDistribution(nextState: DistributionState) {
        val authenticatedUser = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication

        val distribution = distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc()
        if (distribution != null) {
            distribution.state = nextState
            if (nextState == DistributionState.CLOSED) {
                distribution.endedAt = ZonedDateTime.now()
                distribution.endedByUser = userRepository.findByUsername(authenticatedUser.username!!).get()
            }
            distributionRepository.save(distribution)
        }
    }

}
