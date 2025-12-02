package at.wrk.tafel.admin.backend.modules.distribution.internal

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.common.pdf.PDFService
import at.wrk.tafel.admin.backend.database.common.lock.AdvisoryLockKey
import at.wrk.tafel.admin.backend.database.common.lock.AdvisoryLockService
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.customer.CustomerRepository
import at.wrk.tafel.admin.backend.database.model.distribution.*
import at.wrk.tafel.admin.backend.database.model.logistics.RouteRepository
import at.wrk.tafel.admin.backend.database.model.logistics.ShelterRepository
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.CustomerListItem
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.CustomerListPdfModel
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.CustomerListPdfResult
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.DistributionCloseValidationResult
import at.wrk.tafel.admin.backend.modules.distribution.internal.postprocessors.DailyReportMailPostProcessor
import at.wrk.tafel.admin.backend.modules.distribution.internal.postprocessors.ReturnBoxesMailPostProcessor
import at.wrk.tafel.admin.backend.modules.distribution.internal.postprocessors.StatisticMailPostProcessor
import at.wrk.tafel.admin.backend.modules.distribution.internal.ticket.DistributionTicketController
import org.slf4j.LoggerFactory
import org.springframework.data.repository.findByIdOrNull
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional
import org.springframework.transaction.support.TransactionTemplate
import java.math.BigDecimal
import java.math.RoundingMode
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
    private val distributionPostProcessorService: DistributionPostProcessorService,
    private val transactionTemplate: TransactionTemplate,
    private val shelterRepository: ShelterRepository,
    private val routeRepository: RouteRepository,
    private val dailyReportMailPostProcessor: DailyReportMailPostProcessor,
    private val returnBoxesMailPostProcessor: ReturnBoxesMailPostProcessor,
    private val statisticMailPostProcessor: StatisticMailPostProcessor,
    private val advisoryLockService: AdvisoryLockService,
) {
    companion object {
        private val DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
        private val logger = LoggerFactory.getLogger(DistributionTicketController::class.java)
    }

    fun getDistributions(): List<DistributionEntity> {
        return distributionRepository.getDistributionEntityByEndedAtIsNotNullOrderByStartedAtDesc()
    }

    @Transactional
    fun createNewDistribution(): DistributionEntity {
        var result: DistributionEntity? = null

        val acquired = advisoryLockService.tryWithLock(AdvisoryLockKey.CREATE_DISTRIBUTION) {
            val currentDistribution = distributionRepository.getCurrentDistribution()
            if (currentDistribution != null) {
                throw TafelValidationException("Ausgabe bereits gestartet!")
            }

            val authenticatedUser = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication

            val newDistribution = DistributionEntity()
            newDistribution.startedAt = LocalDateTime.now()
            newDistribution.startedByUser = userRepository.findByUsername(authenticatedUser.username!!)

            val statisticEntity = DistributionStatisticEntity().apply {
                distribution = newDistribution
            }
            newDistribution.statistic = statisticEntity

            result = distributionRepository.save(newDistribution)
        }

        if (!acquired) {
            throw TafelValidationException("Eine neue Ausgabe wird gerade gestartet. Bitte kurz warten und im Anschluss die Seite neu laden.")
        }

        return result!!
    }

    @Transactional
    fun getCurrentDistribution(): DistributionEntity? {
        return distributionRepository.getCurrentDistribution()
    }

    @Transactional
    fun assignCustomerToDistribution(
        customerId: Long,
        ticketNumber: Int,
        costContributionPaid: Boolean,
    ) {
        val distribution = getCurrentDistribution()!!

        val customer = customerRepository.findByCustomerId(customerId)
            ?: throw TafelValidationException("Kunde Nr. $customerId nicht vorhanden!")
        val distributionCustomerEntity = distribution.customers.firstOrNull { it.ticketNumber == ticketNumber }

        // Can't assign to another customer if already assigned but ok if it's the same customer (update costContributionPaid flag)
        if (distributionCustomerEntity != null && distributionCustomerEntity.customer?.id != customerId) {
            throw TafelValidationException("Ticketnummer $ticketNumber bereits vergeben!")
        }

        val entry = distributionCustomerEntity ?: DistributionCustomerEntity()
        entry.distribution = distribution
        entry.customer = customer
        entry.ticketNumber = ticketNumber
        entry.costContributionPaid = costContributionPaid
        entry.processed = false

        distributionCustomerRepository.save(entry)
    }

    @Transactional
    fun generateCustomerListPdf(): CustomerListPdfResult? {
        val currentDistribution = distributionRepository.getCurrentDistribution()!!

        val formattedDate = DATE_FORMATTER.format(currentDistribution.startedAt)
        val sortedCustomers = currentDistribution.customers.sortedBy { it.ticketNumber }
        val countCustomers = sortedCustomers.size

        val halftimeIndex = BigDecimal(countCustomers - 1).divide(BigDecimal("2"), RoundingMode.FLOOR).toInt()
        val halftimeTicketNumber = if (countCustomers > 1) sortedCustomers[halftimeIndex].ticketNumber!! else null
        val countAddPersons = sortedCustomers
            .map { it.customer }
            .flatMap {
                it?.additionalPersons?.filterNot { addPerson -> addPerson.excludeFromHousehold!! } ?: emptyList()
            }
            .count()

        val data = CustomerListPdfModel(
            title = "Kundenliste zur Ausgabe vom $formattedDate",
            halftimeTicketNumber = halftimeTicketNumber,
            countCustomersOverall = countCustomers,
            countPersonsOverall = countAddPersons + countCustomers,
            customers = mapCustomersForPdf(sortedCustomers)
        )

        val bytes = pdfService.generatePdf(data, "/pdf-templates/distribution-customerlist/customerlist.xsl")
        val filename = "kundenliste-ausgabe-$formattedDate.pdf"
        return CustomerListPdfResult(filename = filename, bytes = bytes)
    }

    @Transactional
    fun getCurrentTicketNumber(customerId: Long? = null): DistributionCustomerEntity? {
        val distribution = getCurrentDistribution()!!

        val distributionCustomerEntity = getDistributionCustomerEntity(distribution, customerId)
        logger.info("Ticket-Log - Fetched current ticket-number (service): ${distributionCustomerEntity?.ticketNumber}")
        return distributionCustomerEntity
    }

    @Transactional
    fun closeCurrentTicketAndGetNext(): Int? {
        val distribution = getCurrentDistribution()!!

        val distributionCustomerEntity = getDistributionCustomerEntity(distribution)

        if (distributionCustomerEntity != null) {
            distributionCustomerEntity.processed = true
            distributionCustomerRepository.save(distributionCustomerEntity)

            val currentTicketNumber = getCurrentTicketNumber()?.ticketNumber
            logger.info("Ticket-Log - Processed ticket-number: ${distributionCustomerEntity.ticketNumber}, next one: $currentTicketNumber")
            return currentTicketNumber
        }
        return null
    }

    @Transactional
    fun deleteCurrentTicket(customerId: Long): Boolean {
        val distribution = getCurrentDistribution()!!

        val distributionCustomerEntity = getDistributionCustomerEntity(distribution, customerId)
        logger.info("Ticket-Log - Deleted ticket-number: ${distributionCustomerEntity?.ticketNumber}, customer ${distributionCustomerEntity?.customer?.customerId}")

        return distributionCustomerEntity?.let {
            distributionCustomerRepository.delete(it)
            true
        } ?: false
    }

    @Transactional
    fun validateClose(): DistributionCloseValidationResult {
        val errors = mutableListOf<String>()
        val warnings = mutableListOf<String>()

        val currentDistribution = distributionRepository.getCurrentDistribution()
        if (currentDistribution == null) {
            errors.add("Ausgabe nicht gestartet!")
        } else {
            if (currentDistribution.statistic == null || currentDistribution.statistic?.isEmpty() == true) {
                errors.add("Statistik-Daten fehlen!")
            }

            val incompleteRoutes = currentDistribution.foodCollections.filter {
                it.driver == null || it.coDriver == null || it.car == null || it.kmStart == null || it.kmEnd == null || it.items == null || it.items!!.isEmpty()
            }
            if (incompleteRoutes.isNotEmpty()) {
                errors.add("Die Route(n) ${incompleteRoutes.joinToString(", ") { it.route!!.number.toString() }} sind unvollständig!")
            }

            return if (errors.isNotEmpty()) {
                DistributionCloseValidationResult(
                    errors = errors,
                    warnings = emptyList(),
                )
            } else {
                // Warnings
                val routes = routeRepository.findAll()
                val missingRoutes =
                    routes.map { it.number } - currentDistribution.foodCollections.map { it.route!!.number }
                if (missingRoutes.isNotEmpty()) {
                    warnings.add("Die Route(n) ${missingRoutes.joinToString(", ")} wurden nicht erfasst!")
                }

                DistributionCloseValidationResult(
                    errors = emptyList(),
                    warnings = warnings,
                )
            }
        }

        return DistributionCloseValidationResult(
            errors = errors,
            warnings = warnings,
        )
    }

    fun closeDistribution() {
        val acquired = advisoryLockService.tryWithLock(AdvisoryLockKey.CLOSE_DISTRIBUTION) {
            val authenticatedUser = SecurityContextHolder.getContext().authentication as? TafelJwtAuthentication

            // Use REQUIRES_NEW to ensure endedAt is committed before async post-processor runs
            val requiresNewTemplate = TransactionTemplate(transactionTemplate.transactionManager!!).apply {
                propagationBehavior = Propagation.REQUIRES_NEW.value()
            }

            val currentDistribution = requiresNewTemplate.execute {
                val currentDistribution = distributionRepository.getCurrentDistribution()!!
                currentDistribution.endedAt = LocalDateTime.now()
                currentDistribution.endedByUser =
                    authenticatedUser?.let { userRepository.findByUsername(authenticatedUser.username!!) }
                        ?: currentDistribution.startedByUser

                distributionRepository.save(currentDistribution)
            }

            val startDateFormatted = currentDistribution?.startedAt?.format(DateTimeFormatter.ISO_DATE_TIME)
            val endDateFormatted = currentDistribution?.endedAt?.format(DateTimeFormatter.ISO_DATE_TIME)
            logger.info(
                "Closed distribution: ID ${currentDistribution?.id} (started at: $startDateFormatted, ended at: $endDateFormatted)"
            )

            distributionPostProcessorService.process(currentDistribution!!.id!!)
        }

        if (!acquired) {
            throw TafelValidationException("Die Ausgabe wird gerade geschlossen. Bitte kurz warten und im Anschluss die Seite neu laden.")
        }
    }

    private fun getDistributionCustomerEntity(
        distribution: DistributionEntity,
        customerId: Long? = null,
    ): DistributionCustomerEntity? {
        return distribution.customers
            .asSequence()
            .filter { customerId == null || it.customer?.customerId == customerId }
            .filter { it.processed == false }
            .sortedBy { it.ticketNumber }
            .firstOrNull()
    }

    private fun mapCustomersForPdf(customers: List<DistributionCustomerEntity>): List<CustomerListItem> {
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
                countPersons = countPersons,
                countInfants = countInfants ?: 0
            )
        }
    }

    fun updateDistributionStatisticData(
        employeeCount: Int,
        selectedShelterIds: List<Long>,
    ) {
        val currentDistribution = distributionRepository.getCurrentDistribution()!!

        val currentStatistic = currentDistribution.statistic
        if (currentStatistic == null) {
            throw TafelValidationException("Statistik-Daten nicht vorhanden!")
        } else {
            currentStatistic.employeeCount = employeeCount

            val selectedShelters = shelterRepository.findAllById(selectedShelterIds).toList()
            currentStatistic.shelters.clear()
            currentStatistic.shelters = selectedShelters.map {
                DistributionStatisticShelterEntity().apply {
                    createdAt = LocalDateTime.now()
                    updatedAt = LocalDateTime.now()
                    statistic = currentStatistic
                    name = it.name
                    addressStreet = it.addressStreet
                    addressHouseNumber = it.addressHouseNumber
                    addressStairway = it.addressStairway
                    addressPostalCode = it.addressPostalCode
                    addressCity = it.addressCity
                    addressDoor = it.addressDoor
                    personsCount = it.personsCount
                }
            }.toMutableList()

            distributionRepository.save(currentDistribution)
        }
    }

    fun updateDistributionNoteData(notes: String) {
        val currentDistribution = distributionRepository.getCurrentDistribution()!!

        currentDistribution.notes = notes.trim().ifBlank { null }

        distributionRepository.save(currentDistribution)
    }

    @Transactional
    fun sendMails(distributionId: Long) {
        val distribution = distributionRepository.findByIdOrNull(distributionId)
            ?: throw TafelValidationException("Ausgabe nicht gefunden!")

        dailyReportMailPostProcessor.process(distribution, distribution.statistic!!)
        returnBoxesMailPostProcessor.process(distribution, distribution.statistic!!)
        statisticMailPostProcessor.process(distribution, distribution.statistic!!)
    }

}
