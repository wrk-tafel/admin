package at.wrk.tafel.admin.backend.modules.distribution.internal

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.common.pdf.PDFService
import at.wrk.tafel.admin.backend.database.common.lock.AdvisoryLockKey
import at.wrk.tafel.admin.backend.database.common.lock.AdvisoryLockService
import at.wrk.tafel.admin.backend.database.model.auth.UserRepository
import at.wrk.tafel.admin.backend.database.model.distribution.*
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.database.model.logistics.RouteEntity
import at.wrk.tafel.admin.backend.database.model.logistics.RouteRepository
import at.wrk.tafel.admin.backend.database.model.logistics.ShelterRepository
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import at.wrk.tafel.admin.backend.modules.distribution.DistributionClosedEvent
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.DistributionCloseValidationResult
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.DistributionItem
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.HouseholdListItem
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.HouseholdListPdfModel
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.HouseholdListPdfResult
import at.wrk.tafel.admin.backend.modules.distribution.internal.postprocessors.ReturnBoxesMailPostProcessor
import at.wrk.tafel.admin.backend.modules.distribution.internal.ticket.DistributionTicketController
import org.slf4j.LoggerFactory
import org.springframework.context.ApplicationEventPublisher
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
    private val distributionHouseholdRepository: DistributionHouseholdRepository,
    private val householdRepository: HouseholdRepository,
    private val pdfService: PDFService,
    private val distributionPostProcessorService: DistributionPostProcessorService,
    private val transactionTemplate: TransactionTemplate,
    private val shelterRepository: ShelterRepository,
    private val routeRepository: RouteRepository,
    private val returnBoxesMailPostProcessor: ReturnBoxesMailPostProcessor,
    private val advisoryLockService: AdvisoryLockService,
    private val eventPublisher: ApplicationEventPublisher,
) {
    companion object {
        private val DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
        private val logger = LoggerFactory.getLogger(DistributionTicketController::class.java)
    }

    fun getDistributions(): List<DistributionEntity> = distributionRepository.getDistributionEntityByEndedAtIsNotNullOrderByStartedAtDesc()

    fun getDistributionItems(): List<DistributionItem> = getDistributions().map { mapDistribution(it) }

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

    fun createNewDistributionItem(): DistributionItem = mapDistribution(createNewDistribution())

    @Transactional
    fun getCurrentDistribution(): DistributionEntity? = distributionRepository.getCurrentDistribution()

    fun getCurrentDistributionItem(): DistributionItem? = getCurrentDistribution()?.let { mapDistribution(it) }

    fun hasCurrentDistribution(): Boolean = getCurrentDistribution() != null

    @Transactional
    fun assignHouseholdToDistribution(
        householdId: Long,
        ticketNumber: Int,
    ) {
        val distribution = getCurrentDistribution()!!

        val household = householdRepository.findByHouseholdId(householdId)
            ?: throw TafelValidationException("Kunde Nr. $householdId nicht vorhanden!")
        val existingHousehold = distribution.households.firstOrNull { it.household?.householdId == householdId }

        val existingTicket = distribution.households.firstOrNull { it.ticketNumber == ticketNumber }

        // Can't assign to another household if already assigned but ok if it's the same household (update costContributionPaid flag)
        if (existingTicket != null && existingHousehold?.household?.id != householdId) {
            throw TafelValidationException("Ticketnummer $ticketNumber bereits vergeben!")
        }

        val entry = existingHousehold ?: DistributionHouseholdEntity()
        entry.distribution = distribution
        entry.household = household
        entry.ticketNumber = ticketNumber
        entry.processed = false

        distributionHouseholdRepository.save(entry)
    }

    @Transactional
    fun generateHouseholdListPdf(): HouseholdListPdfResult? {
        val currentDistribution = distributionRepository.getCurrentDistribution()!!

        val formattedDate = DATE_FORMATTER.format(currentDistribution.startedAt)
        val sortedHouseholds = distributionHouseholdRepository.findByDistributionId(currentDistribution.id!!)
            .sortedBy { it.ticketNumber }
        val countHouseholds = sortedHouseholds.size

        val halftimeIndex = BigDecimal(countHouseholds - 1).divide(BigDecimal("2"), RoundingMode.FLOOR).toInt()
        val halftimeTicketNumber = if (countHouseholds > 1) sortedHouseholds[halftimeIndex].ticketNumber!! else null
        val countAddPersons = sortedHouseholds
            .map { it.household }
            .flatMap {
                it?.additionalPersons()?.filterNot { addPerson -> addPerson.excludeFromHousehold } ?: emptyList()
            }
            .count()

        val data = HouseholdListPdfModel(
            title = "Kundenliste zur Ausgabe vom $formattedDate",
            halftimeTicketNumber = halftimeTicketNumber,
            countHouseholdsOverall = countHouseholds,
            countPersonsOverall = countAddPersons + countHouseholds,
            households = mapHouseholdsForPdf(sortedHouseholds),
        )

        val bytes = pdfService.generatePdf(data, "/pdf-templates/distribution-customerlist/customerlist.xsl")
        val filename = "kundenliste-ausgabe-$formattedDate.pdf"
        return HouseholdListPdfResult(filename = filename, bytes = bytes)
    }

    @Transactional
    fun getCurrentTicketNumber(householdId: Long? = null): DistributionHouseholdEntity? {
        val distribution = getCurrentDistribution()!!

        val distributionHouseholdEntity = getFirstUnprocessedDistributionHouseholdEntity(distribution, householdId)
        logger.info("Ticket-Log - Fetched current ticket-number (service): ${distributionHouseholdEntity?.ticketNumber}")
        return distributionHouseholdEntity
    }

    @Transactional
    fun getCurrentTicketNumberValue(householdId: Long? = null): Int? = getCurrentTicketNumber(householdId)?.ticketNumber

    @Transactional
    fun reopenAndGetPreviousTicket(): Int? {
        val distribution = getCurrentDistribution()!!

        val distributionHouseholdEntity = getLastProcessedDistributionHouseholdEntity(distribution)

        if (distributionHouseholdEntity != null) {
            distributionHouseholdEntity.processed = false
            distributionHouseholdRepository.save(distributionHouseholdEntity)
            logger.info("Ticket-Log - Reopened ticket-number: ${distributionHouseholdEntity.ticketNumber}")
        }

        val currentTicketNumber = getCurrentTicketNumber()?.ticketNumber
        return currentTicketNumber
    }

    @Transactional
    fun closeCurrentTicketAndGetNext(costContributionPaid: Boolean): Int? {
        val distribution = getCurrentDistribution()!!

        val distributionHouseholdEntity = getFirstUnprocessedDistributionHouseholdEntity(distribution)

        if (distributionHouseholdEntity != null) {
            distributionHouseholdEntity.costContributionPaid = costContributionPaid
            distributionHouseholdEntity.processed = true
            distributionHouseholdRepository.save(distributionHouseholdEntity)

            val currentTicketNumber = getCurrentTicketNumber()?.ticketNumber
            logger.info("Ticket-Log - Processed ticket-number: ${distributionHouseholdEntity.ticketNumber}, next one: $currentTicketNumber")
            return currentTicketNumber
        }
        return null
    }

    @Transactional
    fun deleteCurrentTicket(householdId: Long): Boolean {
        val distribution = getCurrentDistribution()!!

        val distributionHouseholdEntity = getFirstUnprocessedDistributionHouseholdEntity(distribution, householdId)
        logger.info("Ticket-Log - Deleted ticket-number: ${distributionHouseholdEntity?.ticketNumber}, household ${distributionHouseholdEntity?.household?.householdId}")

        return distributionHouseholdEntity?.let {
            distributionHouseholdRepository.delete(it)
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
                val routes: List<RouteEntity> = routeRepository.findAll()
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

    fun closeDistribution(): DistributionEntity {
        var result: DistributionEntity? = null

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

            val startDateFormatted = currentDistribution.startedAt?.format(DateTimeFormatter.ISO_DATE_TIME)
            val endDateFormatted = currentDistribution.endedAt?.format(DateTimeFormatter.ISO_DATE_TIME)
            logger.info(
                "Closed distribution: ID ${currentDistribution.id} (started at: $startDateFormatted, ended at: $endDateFormatted)",
            )

            distributionPostProcessorService.process(currentDistribution.id!!)
            result = currentDistribution
        }

        if (!acquired) {
            throw TafelValidationException("Die Ausgabe wird gerade geschlossen. Bitte kurz warten und im Anschluss die Seite neu laden.")
        }

        return result!!
    }

    private fun mapDistribution(distribution: DistributionEntity): DistributionItem = DistributionItem(
        id = distribution.id!!,
        startedAt = distribution.startedAt!!,
        endedAt = distribution.endedAt,
    )

    private fun getLastProcessedDistributionHouseholdEntity(
        distribution: DistributionEntity,
        householdId: Long? = null,
    ): DistributionHouseholdEntity? = distribution.households
        .asSequence()
        .filter { householdId == null || it.household?.householdId == householdId }
        .filter { it.processed == true }
        .sortedBy { it.ticketNumber }
        .lastOrNull()

    private fun getFirstUnprocessedDistributionHouseholdEntity(
        distribution: DistributionEntity,
        householdId: Long? = null,
    ): DistributionHouseholdEntity? = distribution.households
        .asSequence()
        .filter { householdId == null || it.household?.householdId == householdId }
        .filter { it.processed == false }
        .sortedBy { it.ticketNumber }
        .firstOrNull()

    private fun mapHouseholdsForPdf(households: List<DistributionHouseholdEntity>): List<HouseholdListItem> = households.map { distributionHouseholdEntity ->
        val household = distributionHouseholdEntity.household
        val countPersons = household?.additionalPersons()
            ?.filterNot { it.excludeFromHousehold }
            ?.size?.plus(1) ?: 0
        val countInfants = household?.additionalPersons()
            ?.filterNot { it.excludeFromHousehold }
            ?.count { Period.between(it.birthDate, LocalDate.now()).years < 3 }

        HouseholdListItem(
            ticketNumber = distributionHouseholdEntity.ticketNumber!!,
            householdId = household?.householdId!!,
            countPersons = countPersons,
            countInfants = countInfants ?: 0,
        )
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
                    sortOrder = it.sortOrder
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

        eventPublisher.publishEvent(DistributionClosedEvent(distributionId))
        returnBoxesMailPostProcessor.process(distribution, distribution.statistic!!)
    }
}
