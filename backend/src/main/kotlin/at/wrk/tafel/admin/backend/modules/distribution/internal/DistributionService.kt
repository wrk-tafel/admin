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
import at.wrk.tafel.admin.backend.modules.base.exception.BusinessRuleException
import at.wrk.tafel.admin.backend.modules.base.exception.ConflictException
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.distribution.DistributionClosedEvent
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.DistributionCloseResponse
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.DistributionItem
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.HouseholdListItem
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.HouseholdListPdfModel
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.HouseholdListPdfResult
import at.wrk.tafel.admin.backend.modules.distribution.internal.ticket.DistributionTicketController
import at.wrk.tafel.admin.backend.modules.distribution.internal.ticket.TicketScreenTicketResponse
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
    private val transactionTemplate: TransactionTemplate,
    private val shelterRepository: ShelterRepository,
    private val routeRepository: RouteRepository,
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
                throw ConflictException("Ausgabe bereits gestartet!")
            }

            val authenticatedUser = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication
            val startedByUser = checkNotNull(userRepository.findByUsername(authenticatedUser.username!!)) {
                "Angemeldeter Benutzer '${authenticatedUser.username}' nicht vorhanden!"
            }

            val newDistribution = DistributionEntity(
                startedAt = LocalDateTime.now(),
                startedByUser = startedByUser,
            )

            val statisticEntity = DistributionStatisticEntity(distribution = newDistribution)
            newDistribution.statistic = statisticEntity

            result = distributionRepository.save(newDistribution)
        }

        if (!acquired) {
            throw ConflictException("Eine neue Ausgabe wird gerade gestartet. Bitte kurz warten und im Anschluss die Seite neu laden.")
        }

        return result!!
    }

    fun createNewDistributionItem(): DistributionItem = mapDistribution(createNewDistribution())

    @Transactional(readOnly = true)
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
            ?: throw NotFoundException("Kunde Nr. $householdId nicht vorhanden!")
        val existingHousehold = distribution.households.firstOrNull { it.household.householdId == householdId }

        val existingTicket = distribution.households.firstOrNull { it.ticketNumber == ticketNumber }

        // Can't assign to another household if already assigned but ok if it's the same household (update costContributionPaid flag)
        if (existingTicket != null && existingHousehold?.household?.id != householdId) {
            throw ConflictException("Ticketnummer $ticketNumber bereits vergeben!")
        }

        val entry = existingHousehold ?: DistributionHouseholdEntity(
            distribution = distribution,
            household = household,
            ticketNumber = ticketNumber,
        )
        entry.distribution = distribution
        entry.household = household
        entry.ticketNumber = ticketNumber
        entry.processed = false

        distributionHouseholdRepository.save(entry)
    }

    @Transactional(readOnly = true)
    fun generateHouseholdListPdf(): HouseholdListPdfResult? {
        val currentDistribution = distributionRepository.getCurrentDistribution()!!

        val formattedDate = DATE_FORMATTER.format(currentDistribution.startedAt)
        val sortedHouseholds = distributionHouseholdRepository.findByDistributionId(currentDistribution.id!!)
            .sortedBy { it.ticketNumber }
        val countHouseholds = sortedHouseholds.size

        val halftimeIndex = BigDecimal(countHouseholds - 1).divide(BigDecimal("2"), RoundingMode.FLOOR).toInt()
        val halftimeTicketNumber = if (countHouseholds > 1) sortedHouseholds[halftimeIndex].ticketNumber else null
        val countAddPersons = sortedHouseholds
            .map { it.household }
            .flatMap {
                it.additionalPersons().filterNot { addPerson -> addPerson.excludeFromHousehold }
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

    @Transactional(readOnly = true)
    fun getCurrentTicketNumber(householdId: Long? = null): DistributionHouseholdEntity? {
        val distribution = getCurrentDistribution()!!

        val distributionHouseholdEntity = getFirstUnprocessedDistributionHouseholdEntity(distribution, householdId)
        logger.info("Ticket-Log - Fetched current ticket-number (service): ${distributionHouseholdEntity?.ticketNumber}")
        return distributionHouseholdEntity
    }

    @Transactional(readOnly = true)
    fun getCurrentTicketNumberValue(householdId: Long? = null): Int? = getCurrentTicketNumber(householdId)?.ticketNumber

    /**
     * Same "current ticket" lookup as [getCurrentTicketNumber], but mapped to a DTO so that
     * [DistributionTicketScreenController] (which also needs the household id and its pending
     * debt, not just the ticket number) never has to touch [DistributionHouseholdEntity] itself -
     * controllers are architecturally forbidden from depending on `database.model` entities
     * directly, see `ProjectSpecificRulesTest`.
     */
    @Transactional(readOnly = true)
    fun getCurrentTicketScreenTicket(): TicketScreenTicketResponse = if (hasCurrentDistribution()) {
        mapToTicketScreenTicket(getCurrentTicketNumber())
    } else {
        mapToTicketScreenTicket(null)
    }

    @Transactional
    fun reopenAndGetPreviousTicket(): TicketScreenTicketResponse {
        val distribution = getCurrentDistribution()!!

        val distributionHouseholdEntity = getLastProcessedDistributionHouseholdEntity(distribution)

        if (distributionHouseholdEntity != null) {
            distributionHouseholdEntity.processed = false
            distributionHouseholdRepository.save(distributionHouseholdEntity)
            logger.info("Ticket-Log - Reopened ticket-number: ${distributionHouseholdEntity.ticketNumber}")
        }

        return mapToTicketScreenTicket(getCurrentTicketNumber())
    }

    @Transactional
    fun closeCurrentTicketAndGetNext(costContributionPaid: Boolean): TicketScreenTicketResponse {
        val distribution = getCurrentDistribution()!!

        val distributionHouseholdEntity = getFirstUnprocessedDistributionHouseholdEntity(distribution)

        if (distributionHouseholdEntity != null) {
            distributionHouseholdEntity.costContributionPaid = costContributionPaid
            distributionHouseholdEntity.processed = true
            distributionHouseholdRepository.save(distributionHouseholdEntity)

            val nextTicket = getCurrentTicketNumber()
            logger.info("Ticket-Log - Processed ticket-number: ${distributionHouseholdEntity.ticketNumber}, next one: ${nextTicket?.ticketNumber}")
            return mapToTicketScreenTicket(nextTicket)
        }
        return mapToTicketScreenTicket(null)
    }

    private fun mapToTicketScreenTicket(distributionHouseholdEntity: DistributionHouseholdEntity?) = TicketScreenTicketResponse(
        ticketNumber = distributionHouseholdEntity?.ticketNumber,
        householdId = distributionHouseholdEntity?.household?.householdId,
        pendingCostContribution = distributionHouseholdEntity?.household?.pendingCostContribution,
    )

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

    @Transactional(readOnly = true)
    fun validateClose(): DistributionCloseResponse {
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
                errors.add("Die Route(n) ${incompleteRoutes.joinToString(", ") { it.route.number.toString() }} sind unvollständig!")
            }

            return if (errors.isNotEmpty()) {
                DistributionCloseResponse(
                    errors = errors,
                    warnings = emptyList(),
                )
            } else {
                // Warnings
                val routes: List<RouteEntity> = routeRepository.findAll()
                val missingRoutes =
                    routes.map { it.number } - currentDistribution.foodCollections.map { it.route.number }
                if (missingRoutes.isNotEmpty()) {
                    warnings.add("Die Route(n) ${missingRoutes.joinToString(", ")} wurden nicht erfasst!")
                }

                DistributionCloseResponse(
                    errors = emptyList(),
                    warnings = warnings,
                )
            }
        }

        return DistributionCloseResponse(
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

            val startDateFormatted = currentDistribution.startedAt.format(DateTimeFormatter.ISO_DATE_TIME)
            val endDateFormatted = currentDistribution.endedAt?.format(DateTimeFormatter.ISO_DATE_TIME)
            logger.info(
                "Closed distribution: ID ${currentDistribution.id} (started at: $startDateFormatted, ended at: $endDateFormatted)",
            )

            try {
                eventPublisher.publishEvent(DistributionEndedEvent(currentDistribution.id!!))
            } catch (e: Exception) {
                logger.error("Publishing DistributionEndedEvent failed", e)
                throw e
            }
            result = currentDistribution
        }

        if (!acquired) {
            throw ConflictException("Die Ausgabe wird gerade geschlossen. Bitte kurz warten und im Anschluss die Seite neu laden.")
        }

        return result!!
    }

    private fun mapDistribution(distribution: DistributionEntity): DistributionItem = DistributionItem(
        id = distribution.id!!,
        startedAt = distribution.startedAt,
        endedAt = distribution.endedAt,
    )

    private fun getLastProcessedDistributionHouseholdEntity(
        distribution: DistributionEntity,
        householdId: Long? = null,
    ): DistributionHouseholdEntity? = distribution.households
        .asSequence()
        .filter { householdId == null || it.household.householdId == householdId }
        .filter { it.processed == true }
        .sortedBy { it.ticketNumber }
        .lastOrNull()

    private fun getFirstUnprocessedDistributionHouseholdEntity(
        distribution: DistributionEntity,
        householdId: Long? = null,
    ): DistributionHouseholdEntity? = distribution.households
        .asSequence()
        .filter { householdId == null || it.household.householdId == householdId }
        .filter { it.processed == false }
        .sortedBy { it.ticketNumber }
        .firstOrNull()

    private fun mapHouseholdsForPdf(households: List<DistributionHouseholdEntity>): List<HouseholdListItem> = households.map { distributionHouseholdEntity ->
        val household = distributionHouseholdEntity.household
        val countPersons = household.additionalPersons()
            .filterNot { it.excludeFromHousehold }
            .size + 1
        val countInfants = household.additionalPersons()
            .filterNot { it.excludeFromHousehold }
            .count { Period.between(it.birthDate, LocalDate.now()).years < 3 }

        HouseholdListItem(
            ticketNumber = distributionHouseholdEntity.ticketNumber,
            householdId = household.householdId,
            countPersons = countPersons,
            countInfants = countInfants,
        )
    }

    fun updateDistributionStatisticData(
        employeeCount: Int,
        selectedShelterIds: List<Long>,
    ) {
        val currentDistribution = distributionRepository.getCurrentDistribution()!!

        val currentStatistic = currentDistribution.statistic
        if (currentStatistic == null) {
            throw BusinessRuleException("Statistik-Daten nicht vorhanden!")
        } else {
            currentStatistic.employeeCount = employeeCount

            val selectedShelters = shelterRepository.findAllById(selectedShelterIds).toList()
            currentStatistic.shelters.clear()
            currentStatistic.shelters = selectedShelters.map {
                DistributionStatisticShelterEntity(
                    statistic = currentStatistic,
                    name = it.name,
                    addressStreet = it.addressStreet,
                    addressHouseNumber = it.addressHouseNumber,
                    addressPostalCode = it.addressPostalCode,
                    addressCity = it.addressCity,
                    personsCount = it.personsCount,
                    sortOrder = it.sortOrder,
                ).apply {
                    createdAt = LocalDateTime.now()
                    updatedAt = LocalDateTime.now()
                    addressStairway = it.addressStairway
                    addressDoor = it.addressDoor
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

    @Transactional(readOnly = true)
    fun sendMails(distributionId: Long) {
        distributionRepository.findByIdOrNull(distributionId)
            ?: throw NotFoundException("Ausgabe nicht gefunden!")

        try {
            eventPublisher.publishEvent(DistributionClosedEvent(distributionId))
        } catch (e: Exception) {
            logger.error("Publishing DistributionClosedEvent failed", e)
            throw e
        }
    }
}
