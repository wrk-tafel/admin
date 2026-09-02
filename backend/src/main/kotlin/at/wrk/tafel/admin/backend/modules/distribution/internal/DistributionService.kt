package at.wrk.tafel.admin.backend.modules.distribution.internal

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.common.pdf.PDFService
import at.wrk.tafel.admin.backend.common.sanitizeForLog
import at.wrk.tafel.admin.backend.database.common.audit.AuditLogWriter
import at.wrk.tafel.admin.backend.database.common.audit.AuditOperation
import at.wrk.tafel.admin.backend.database.common.audit.AuditScope
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
import at.wrk.tafel.admin.backend.modules.distribution.events.AllTicketsProcessedEvent
import at.wrk.tafel.admin.backend.modules.distribution.events.CheckinStartedEvent
import at.wrk.tafel.admin.backend.modules.distribution.events.DistributionClosedEvent
import at.wrk.tafel.admin.backend.modules.distribution.events.DistributionStartedEvent
import at.wrk.tafel.admin.backend.modules.distribution.events.FoodHandoutStartedEvent
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.DistributionCloseResponse
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.DistributionItem
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.HouseholdListItem
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.HouseholdListPdfModel
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.HouseholdListPdfResult
import at.wrk.tafel.admin.backend.modules.distribution.internal.ticket.TicketScreenTicketResponse
import org.apache.commons.io.IOUtils
import org.slf4j.LoggerFactory
import org.springframework.context.ApplicationEventPublisher
import org.springframework.data.repository.findByIdOrNull
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional
import org.springframework.transaction.support.TransactionTemplate
import org.springframework.util.MimeTypeUtils
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
    private val auditLogWriter: AuditLogWriter,
) {
    companion object {
        private val DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
        private val logger = LoggerFactory.getLogger(DistributionService::class.java)
        private const val ALREADY_CLOSED_MESSAGE = "Ausgabe bereits geschlossen!"
    }

    fun getDistributions(): List<DistributionEntity> = distributionRepository.getDistributionEntityByEndedAtIsNotNullOrderByStartedAtDesc()

    fun getDistributionItems(): List<DistributionItem> = getDistributions().map { mapDistribution(it) }

    fun createNewDistribution(): DistributionEntity {
        var result: DistributionEntity? = null

        val acquired = advisoryLockService.tryWithLock(AdvisoryLockKey.CREATE_DISTRIBUTION) {
            val currentDistribution = distributionRepository.getCurrentDistribution()
            if (currentDistribution != null) {
                throw ConflictException("Ausgabe bereits gestartet!")
            }

            val authenticatedUser = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication

            // REQUIRES_NEW to ensure the new distribution is committed before DistributionStartedEvent
            // listeners react to it - same reasoning as closeDistribution's use of REQUIRES_NEW below.
            val requiresNewTemplate = TransactionTemplate(transactionTemplate.transactionManager!!).apply {
                propagationBehavior = Propagation.REQUIRES_NEW.value()
            }

            val newDistribution = requiresNewTemplate.execute {
                val startedByUser = checkNotNull(userRepository.findByUsername(authenticatedUser.username!!)) {
                    "Angemeldeter Benutzer '${authenticatedUser.username}' nicht vorhanden!"
                }

                val newDistribution = DistributionEntity(
                    startedAt = LocalDateTime.now(),
                    startedByUser = startedByUser,
                )

                val statisticEntity = DistributionStatisticEntity(distribution = newDistribution)
                newDistribution.statistic = statisticEntity

                distributionRepository.save(newDistribution).also {
                    logger.info("Started distribution: ID ${it.id} (started by: ${sanitizeForLog(startedByUser.username)}, at: ${it.startedAt})")
                }
            }

            result = newDistribution
        }

        if (!acquired) {
            throw ConflictException("Eine neue Ausgabe wird gerade gestartet. Bitte kurz warten und im Anschluss die Seite neu laden.")
        }

        val createdDistribution = checkNotNull(result) { "Ausgabe konnte nicht gestartet werden!" }

        // Published outside the locked block on purpose: the lock is transaction-level, so anything
        // running inside that block extends the lock, its transaction and its pooled connection for as
        // long as it takes. Listeners are free to do slow work (the push fan-out in `push` does blocking
        // HTTPS sends per device), and none of it needs the CREATE_DISTRIBUTION lock - that lock only
        // guards the "no distribution running yet" check plus the insert above.
        try {
            eventPublisher.publishEvent(DistributionStartedEvent(createdDistribution.id!!))
        } catch (e: Exception) {
            logger.error("Publishing DistributionStartedEvent failed", e)
            throw e
        }

        return createdDistribution
    }

    fun createNewDistributionItem(): DistributionItem = mapDistribution(createNewDistribution())

    @Transactional(readOnly = true)
    fun getCurrentDistribution(): DistributionEntity? = distributionRepository.getCurrentDistribution()

    fun getCurrentDistributionItem(): DistributionItem? = getCurrentDistribution()?.let { mapDistribution(it) }

    fun hasCurrentDistribution(): Boolean = getCurrentDistribution() != null

    /**
     * When the most recently ended distribution ended - the ticket-screen SSE stream uses it as
     * the lower bound for replaying what the monitor last showed (see
     * [at.wrk.tafel.admin.backend.modules.distribution.internal.ticket.DistributionTicketScreenSseController]),
     * so state from a past distribution day never resurfaces on a freshly opened monitor.
     */
    fun getLastEndedDistributionTime(): LocalDateTime? = distributionRepository.findFirstByEndedAtIsNotNullOrderByStartedAtDesc()?.endedAt

    /**
     * Wrapped in [AdvisoryLockKey.ASSIGN_HOUSEHOLD_TO_DISTRIBUTION] because the checks below are a
     * check-then-act against two `UNIQUE` constraints (`uc_distributionid_ticketnumber` and
     * `uq_distributions_households_distribution_household`): two check-in desks submitting the same
     * ticket number, or the same household, within the same window would otherwise both pass the
     * check and the loser would get a duplicate-key 500 instead of the intended
     * [ConflictException].
     *
     * Also takes [AdvisoryLockKey.CLOSE_DISTRIBUTION] (blocking, before the inner lock) so this
     * can't straddle an in-flight [closeDistribution]: without it, the interceptor's
     * `@TafelActiveDistributionRequired` check could pass just before a concurrent close commits,
     * turning `getCurrentDistribution()!!` into an NPE instead of the [ConflictException] below - or
     * this insert could commit *after* [DistributionEndedEventListener] already read
     * `distribution.households` for the closing distribution, silently excluding the household from
     * that day's statistics and cost-contribution tracking (issue #3602).
     */
    @Transactional
    fun assignHouseholdToDistribution(
        householdId: Long,
        ticketNumber: Int,
    ) {
        advisoryLockService.acquireLock(AdvisoryLockKey.CLOSE_DISTRIBUTION)
        advisoryLockService.withLock(AdvisoryLockKey.ASSIGN_HOUSEHOLD_TO_DISTRIBUTION) {
            val distribution = getCurrentDistribution() ?: throw ConflictException(ALREADY_CLOSED_MESSAGE)

            val household = householdRepository.findByHouseholdId(householdId)
                ?: throw NotFoundException("Kunde Nr. $householdId nicht vorhanden!")
            val existingHousehold = distribution.households.firstOrNull { it.household.householdId == householdId }

            val existingTicket = distribution.households.firstOrNull { it.ticketNumber == ticketNumber }

            // Can't assign to another household if already assigned but ok if it's the same household (update costContributionPaid flag)
            if (existingTicket != null && existingTicket.household.householdId != householdId) {
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

            // The first check-in of the day is the moment the desk opens - see DistributionPhaseEvents.
            if (distributionRepository.markCheckinStarted(distribution.id!!, LocalDateTime.now()) == 1) {
                eventPublisher.publishEvent(CheckinStartedEvent(distribution.id!!))
            }
        }
    }

    /**
     * Not read-only: the Kundenliste export is one of the sensitive-handful reads recorded in
     * `audit_log` (see issue #3180), and [AuditLogWriter.record]'s write only takes effect for a
     * transaction that actually commits as one - see [AuditLogWriter]'s `beforeCommit`.
     */
    @Transactional
    fun generateHouseholdListPdf(): HouseholdListPdfResult? {
        val currentDistribution = distributionRepository.getCurrentDistribution() ?: throw ConflictException(ALREADY_CLOSED_MESSAGE)

        val formattedDate = DATE_FORMATTER.format(currentDistribution.startedAt)

        auditLogWriter.record(
            AuditLogWriter.PendingEntry(
                entityType = AuditScope.DISTRIBUTION_HOUSEHOLD_LIST_ENTITY_TYPE,
                entityId = currentDistribution.id,
                businessKey = formattedDate,
                operation = AuditOperation.READ,
                changedFields = emptyMap(),
            ),
        )
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

        val logoBytes = IOUtils.toByteArray(javaClass.getResourceAsStream("/assets/logo.png"))
        val data = HouseholdListPdfModel(
            logoContentType = MimeTypeUtils.IMAGE_PNG_VALUE,
            logoBytes = logoBytes,
            title = "Kundenliste zur Ausgabe vom $formattedDate",
            halftimeTicketNumber = halftimeTicketNumber,
            countHouseholdsOverall = countHouseholds,
            countPersonsOverall = countAddPersons + countHouseholds,
            households = mapHouseholdsForPdf(sortedHouseholds, currentDistribution.startedAt.toLocalDate()),
        )

        val bytes = pdfService.generatePdf(data, "/pdf-templates/distribution-customerlist/customerlist.xsl")
        val filename = "kundenliste-ausgabe-$formattedDate.pdf"
        return HouseholdListPdfResult(filename = filename, bytes = bytes)
    }

    @Transactional(readOnly = true)
    fun getCurrentTicketNumber(householdId: Long? = null): DistributionHouseholdEntity? {
        val distribution = getCurrentDistribution() ?: throw ConflictException(ALREADY_CLOSED_MESSAGE)

        return getFirstUnprocessedDistributionHouseholdEntity(distribution, householdId)
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
    fun getCurrentTicketScreenTicket(): TicketScreenTicketResponse {
        val distribution = getCurrentDistribution() ?: return mapToTicketScreenTicket(null, null)
        return mapToTicketScreenTicket(getCurrentTicketNumber(), distribution)
    }

    @Transactional
    fun reopenAndGetPreviousTicket(): TicketScreenTicketResponse {
        val distribution = getCurrentDistribution() ?: throw ConflictException(ALREADY_CLOSED_MESSAGE)

        val distributionHouseholdEntity = getLastProcessedDistributionHouseholdEntity(distribution)

        if (distributionHouseholdEntity != null) {
            distributionHouseholdEntity.processed = false
            distributionHouseholdRepository.save(distributionHouseholdEntity)
            logger.info(
                "Reopened ticket ${distributionHouseholdEntity.ticketNumber} " +
                    "(household: ${distributionHouseholdEntity.household.householdId}, distribution: ID ${distribution.id})",
            )
        }

        return mapToTicketScreenTicket(getCurrentTicketNumber(), distribution)
    }

    @Transactional
    fun closeCurrentTicketAndGetNext(costContributionPaid: Boolean?): TicketScreenTicketResponse {
        val distribution = getCurrentDistribution() ?: throw ConflictException(ALREADY_CLOSED_MESSAGE)

        val distributionHouseholdEntity = getFirstUnprocessedDistributionHouseholdEntity(distribution)

        if (distributionHouseholdEntity != null) {
            // null = no new paid/unpaid decision - a ticket reopened via reopenAndGetPreviousTicket
            // keeps the decision recorded when it was originally processed.
            if (costContributionPaid != null) {
                distributionHouseholdEntity.costContributionPaid = costContributionPaid
            }
            distributionHouseholdEntity.processed = true
            distributionHouseholdRepository.save(distributionHouseholdEntity)

            val nextTicket = getCurrentTicketNumber()
            logger.info(
                "Processed ticket ${distributionHouseholdEntity.ticketNumber} " +
                    "(household: ${distributionHouseholdEntity.household.householdId}, distribution: ID ${distribution.id}), " +
                    "next one: ${nextTicket?.ticketNumber}",
            )

            // A ticket having been *processed* is the first point at which food has demonstrably
            // been handed to someone. Deliberately not "a ticket was shown on the screen": the
            // current ticket can be (re-)shown - possibly hours early, with the monitor still
            // switched off - without any food having changed hands. See DistributionPhaseEvents.
            if (distributionRepository.markFoodHandoutStarted(distribution.id!!, LocalDateTime.now()) == 1) {
                eventPublisher.publishEvent(FoodHandoutStartedEvent(distribution.id!!))
            }

            // Nothing left to call means every household that checked in has been served - see
            // DistributionPhaseEvents.
            if (nextTicket == null &&
                distributionRepository.markTicketsCompleted(distribution.id!!, LocalDateTime.now()) == 1
            ) {
                eventPublisher.publishEvent(
                    AllTicketsProcessedEvent(
                        distributionId = distribution.id!!,
                        ticketCount = distribution.households.size,
                    ),
                )
            }

            return mapToTicketScreenTicket(nextTicket, distribution)
        }
        return mapToTicketScreenTicket(null, distribution)
    }

    /**
     * [distribution] is passed in separately (rather than read off [distributionHouseholdEntity])
     * because the queue counts below must still be available when nothing is currently being
     * called - e.g. every household already served, or the "no active distribution" case where
     * both are null.
     */
    private fun mapToTicketScreenTicket(
        distributionHouseholdEntity: DistributionHouseholdEntity?,
        distribution: DistributionEntity?,
    ) = TicketScreenTicketResponse(
        ticketNumber = distributionHouseholdEntity?.ticketNumber,
        householdId = distributionHouseholdEntity?.household?.householdId,
        householdName = distributionHouseholdEntity?.household?.mainPerson?.let { "${it.firstname} ${it.lastname}" },
        pendingCostContribution = distributionHouseholdEntity?.household?.pendingCostContribution,
        processedTicketsCount = distribution?.households?.count { it.processed == true },
        totalTicketsCount = distribution?.households?.size,
    )

    @Transactional
    fun deleteCurrentTicket(householdId: Long): Boolean {
        val distribution = getCurrentDistribution() ?: throw ConflictException(ALREADY_CLOSED_MESSAGE)

        val distributionHouseholdEntity = getFirstUnprocessedDistributionHouseholdEntity(distribution, householdId)

        return distributionHouseholdEntity?.let {
            distributionHouseholdRepository.delete(it)
            logger.info(
                "Deleted ticket ${it.ticketNumber} " +
                    "(household: ${it.household.householdId}, distribution: ID ${distribution.id})",
            )

            // Deleting the last unprocessed ticket reaches the same "everyone served" state as
            // processing it (see closeCurrentTicketAndGetNext), but without going through that method
            // - so it has to mark completion here too, or AllTicketsProcessedEvent never fires for
            // this distribution. `distribution.households` is the already-loaded collection from
            // getFirstUnprocessedDistributionHouseholdEntity above, so the just-deleted entity is
            // excluded by id rather than relying on the delete having removed it from that collection.
            val remainingHouseholds = distribution.households.filter { entity -> entity.id != it.id }
            val unprocessedTicketsRemain = remainingHouseholds.any { entity -> entity.processed == false }
            if (!unprocessedTicketsRemain &&
                distributionRepository.markTicketsCompleted(distribution.id!!, LocalDateTime.now()) == 1
            ) {
                eventPublisher.publishEvent(
                    AllTicketsProcessedEvent(
                        distributionId = distribution.id!!,
                        ticketCount = remainingHouseholds.size,
                    ),
                )
            }

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
                errors.add("Die Route(n) ${incompleteRoutes.joinToString(", ") { it.route.name }} sind unvollständig!")
            }

            return if (errors.isNotEmpty()) {
                DistributionCloseResponse(
                    errors = errors,
                    warnings = emptyList(),
                )
            } else {
                // Warnings
                // a disabled route isn't driven anymore, so not recording it is not a problem
                val routes: List<RouteEntity> = routeRepository.findByEnabledIsTrue()
                val recordedRouteIds = currentDistribution.foodCollections.map { it.route.id }
                val missingRoutes = routes.filterNot { recordedRouteIds.contains(it.id) }
                if (missingRoutes.isNotEmpty()) {
                    warnings.add("Die Route(n) ${missingRoutes.joinToString(", ") { it.name }} wurden nicht erfasst!")
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
                // The interceptor's @TafelActiveDistributionRequired check runs before this lock is
                // acquired, so a second close request can still reach here after a first one already
                // committed - getCurrentDistribution() is then null. A ConflictException here surfaces
                // as 409 instead of the NPE an unguarded `!!` would produce.
                val currentDistribution = distributionRepository.getCurrentDistribution()
                    ?: throw ConflictException(ALREADY_CLOSED_MESSAGE)
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

    /**
     * [referenceDate] is the distribution's own day rather than today, so a list regenerated for a
     * past distribution still counts the infants it had on the day.
     */
    private fun mapHouseholdsForPdf(
        households: List<DistributionHouseholdEntity>,
        referenceDate: LocalDate,
    ): List<HouseholdListItem> = households.map { distributionHouseholdEntity ->
        val household = distributionHouseholdEntity.household
        val countPersons = household.additionalPersons()
            .filterNot { it.excludeFromHousehold }
            .size + 1
        val countInfants = household.additionalPersons()
            .filterNot { it.excludeFromHousehold }
            .count { it.birthDate != null && Period.between(it.birthDate, referenceDate).years < 3 }

        HouseholdListItem(
            ticketNumber = distributionHouseholdEntity.ticketNumber,
            householdId = household.householdId,
            countPersons = countPersons,
            countInfants = countInfants,
        )
    }

    @Transactional
    fun updateDistributionStatisticData(
        employeeCount: Int,
        selectedShelterIds: List<Long>,
    ) {
        val currentDistribution = distributionRepository.getCurrentDistribution() ?: throw ConflictException(ALREADY_CLOSED_MESSAGE)

        val currentStatistic = currentDistribution.statistic
        if (currentStatistic == null) {
            throw BusinessRuleException("Statistik-Daten nicht vorhanden!")
        } else {
            currentStatistic.employeeCount = employeeCount

            val selectedShelters = shelterRepository.findAllById(selectedShelterIds).toList()
            // Mutate the existing collection in place - reassigning `shelters` to a brand-new list
            // detaches Hibernate's live PersistentBag from the field, and orphanRemoval = true then
            // fails the flush with "collection ... was no longer referenced", surfacing to the
            // caller as an UnexpectedRollbackException once this whole method runs inside one
            // transaction/session (issue #3602's @Transactional addition exposed this).
            currentStatistic.shelters.clear()
            currentStatistic.shelters.addAll(
                selectedShelters.map {
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
                },
            )

            distributionRepository.save(currentDistribution)
        }
    }

    @Transactional
    fun updateDistributionNoteData(notes: String) {
        val currentDistribution = distributionRepository.getCurrentDistribution() ?: throw ConflictException(ALREADY_CLOSED_MESSAGE)

        currentDistribution.notes = notes.trim().ifBlank { null }

        distributionRepository.save(currentDistribution)
    }

    /**
     * Deliberately *not* `@Transactional`: `reporting`'s listener runs synchronously on this thread and
     * opens a read-write transaction per mail to queue it (see `DistributionClosedEventListener`). A
     * transaction here would be the one those participate in - and a read-only one, as this method only
     * reads its own data, would make every mail fail on `mail_outbox`'s sequence. Nothing here needs a
     * transaction of its own anyway: `endedAt` is a plain column on the entity just fetched, not a lazy
     * association. Same shape as the automatic path, where `DistributionEndedEventListener` publishes
     * the event after its transaction has committed.
     */
    fun sendMails(distributionId: Long) {
        val distribution = distributionRepository.findByIdOrNull(distributionId)
            ?: throw NotFoundException("Ausgabe nicht gefunden!")

        if (distribution.endedAt == null) {
            throw ConflictException("Ausgabe ist noch nicht beendet!")
        }

        try {
            eventPublisher.publishEvent(DistributionClosedEvent(distributionId, resend = true))
        } catch (e: Exception) {
            logger.error("Publishing DistributionClosedEvent failed", e)
            throw e
        }
    }
}
