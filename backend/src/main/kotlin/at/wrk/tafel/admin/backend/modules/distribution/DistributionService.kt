package at.wrk.tafel.admin.backend.modules.distribution

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
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
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.Period

import java.time.format.DateTimeFormatter

@Service
class DistributionService(
    private val distributionRepository: DistributionRepository,
    private val userRepository: UserRepository,
    private val distributionCustomerRepository: DistributionCustomerRepository,
    private val customerRepository: CustomerRepository,
    private val pdfService: PDFService,
    private val distributionPostProcessorService: DistributionPostProcessorService
) {
    companion object {
        private val DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
    }

    fun createNewDistribution(): DistributionEntity {
        val currentDistribution = distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc()
        if (currentDistribution != null) {
            throw TafelValidationException("Ausgabe bereits gestartet!")
        }

        val authenticatedUser = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication

        val distribution = DistributionEntity()
        distribution.startedAt = LocalDateTime.now()
        distribution.startedByUser = userRepository.findByUsername(authenticatedUser.username!!).get()

        return distributionRepository.save(distribution)
    }

    @Transactional
    fun getCurrentDistribution(): DistributionEntity? {
        return distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc()
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

    @Transactional
    fun generateCustomerListPdf(): CustomerListPdfResult? {
        val currentDistribution = distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc()
            ?: throw TafelValidationException("Ausgabe nicht gestartet!")

        val formattedDate = DATE_FORMATTER.format(currentDistribution?.startedAt)
        val sortedCustomers = currentDistribution.customers.sortedBy { it.ticketNumber }
        val countCustomers = sortedCustomers.size

        val halftimeIndex = (countCustomers - 1) / 2
        val halftimeTicketNumber = if (countCustomers > 2) sortedCustomers[halftimeIndex].ticketNumber!! else null
        val countAddPersons = sortedCustomers
            .map { it.customer }
            .flatMap {
                it?.additionalPersons?.filterNot { addPerson -> addPerson.excludeFromHousehold!! } ?: emptyList()
            }
            .count()

        val data = CustomerListPdfModel(
            title = "Kundenliste zur Ausgabe vom $formattedDate",
            halftimeTicketNumber = halftimeTicketNumber,
            countPersonsOverall = countAddPersons + countCustomers,
            customers = mapCustomers(sortedCustomers)
        )

        val bytes = pdfService.generatePdf(data, "/pdf-templates/distribution-customerlist/customerlist.xsl")
        val filename = "kundenliste-ausgabe-$formattedDate.pdf"
        return CustomerListPdfResult(filename = filename, bytes = bytes)
    }

    @Transactional
    fun getCurrentTicketNumber(customerId: Long? = null): Int? {
        val distribution = getCurrentDistribution()
            ?: throw TafelValidationException("Ausgabe nicht gestartet!")

        return getDistributionCustomerEntity(distribution, customerId)?.ticketNumber
    }

    @Transactional
    fun closeCurrentTicketAndGetNext(): Int? {
        val distribution = getCurrentDistribution()
            ?: throw TafelValidationException("Ausgabe nicht gestartet!")

        val distributionCustomerEntity = getDistributionCustomerEntity(distribution)

        if (distributionCustomerEntity != null) {
            distributionCustomerEntity.processed = true
            distributionCustomerRepository.save(distributionCustomerEntity)

            return getCurrentTicketNumber()
        }
        return null
    }

    @Transactional
    fun deleteCurrentTicket(customerId: Long): Boolean {
        val distribution = getCurrentDistribution()
            ?: throw TafelValidationException("Ausgabe nicht gestartet!")

        val distributionCustomerEntity = getDistributionCustomerEntity(distribution, customerId)
        return distributionCustomerEntity?.let {
            distributionCustomerRepository.delete(it)
            true
        } ?: false
    }

    @Transactional
    fun closeDistribution() {
        val currentDistribution = distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc()
            ?: throw TafelValidationException("Ausgabe nicht gestartet!")

        if (currentDistribution != null) {
            val distribution = distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc()
            val authenticatedUser = SecurityContextHolder.getContext().authentication as? TafelJwtAuthentication

            if (distribution != null) {
                distribution.endedAt = LocalDateTime.now()
                distribution.endedByUser =
                    authenticatedUser?.let { userRepository.findByUsername(authenticatedUser.username!!).get() }
                        ?: distribution.startedByUser

                val persistedDistribution = distributionRepository.save(distribution)
                distributionPostProcessorService.process(persistedDistribution)
            }
        }
    }

    private fun getDistributionCustomerEntity(
        distribution: DistributionEntity,
        customerId: Long? = null
    ): DistributionCustomerEntity? {
        return distribution.customers
            .asSequence()
            .filter { customerId == null || it.customer?.customerId == customerId }
            .filter { it.processed == false }
            .sortedBy { it.ticketNumber }
            .firstOrNull()
    }

    private fun mapCustomers(customers: List<DistributionCustomerEntity>): List<CustomerListItem> {
        return customers.map { distributionCustomerEntity ->
            val customer = distributionCustomerEntity.customer
            val countPersons = customer?.additionalPersons
                ?.filterNot { it.excludeFromHousehold!! }
                ?.size?.plus(1) ?: 0
            val countInfants = customer?.additionalPersons
                ?.filterNot { it.excludeFromHousehold!! }
                ?.count { Period.between(it.birthDate, LocalDate.now()).years < 3 }

            CustomerListItem(
                ticketNumber = distributionCustomerEntity.ticketNumber!!,
                customerId = customer?.customerId!!,
                name = "${customer?.lastname} ${customer?.firstname}",
                countPersons = countPersons,
                countInfants = countInfants ?: 0
            )
        }
    }

}
