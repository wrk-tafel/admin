package at.wrk.tafel.admin.backend.modules.household.internal

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.api.PaginationDefaults
import at.wrk.tafel.admin.backend.common.csv.CsvUtil
import at.wrk.tafel.admin.backend.config.properties.TafelAdminProperties
import at.wrk.tafel.admin.backend.database.common.audit.AuditActorProvider
import at.wrk.tafel.admin.backend.database.common.audit.AuditLogWriter
import at.wrk.tafel.admin.backend.database.common.audit.AuditOperation
import at.wrk.tafel.admin.backend.database.common.audit.AuditScope
import at.wrk.tafel.admin.backend.database.common.search.SearchTextSpecs
import at.wrk.tafel.admin.backend.database.model.audit.AuditLogRepository
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.household.DocumentRepository
import at.wrk.tafel.admin.backend.database.model.household.DocumentType
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity.Specs.Companion.lockedHousehold
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity.Specs.Companion.missingPrivacyNoticeDocument
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity.Specs.Companion.orderBySearchRelevance
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity.Specs.Companion.pendingCostContribution
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity.Specs.Companion.postProcessingNecessary
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity.Specs.Companion.privacyNoticeRetentionDrift
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity.Specs.Companion.searchTextMatches
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity.Specs.Companion.validHousehold
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity.Specs.Companion.willBeDeletedSoon
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.modules.base.exception.ConflictException
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.household.HouseholdAboveLimitItem
import at.wrk.tafel.admin.backend.modules.household.HouseholdAddress
import at.wrk.tafel.admin.backend.modules.household.HouseholdCreationResponse
import at.wrk.tafel.admin.backend.modules.household.HouseholdOverviewItem
import at.wrk.tafel.admin.backend.modules.household.HouseholdOverviewResponse
import at.wrk.tafel.admin.backend.modules.household.HouseholdPdfType
import at.wrk.tafel.admin.backend.modules.household.HouseholdRequest
import at.wrk.tafel.admin.backend.modules.household.HouseholdResponse
import at.wrk.tafel.admin.backend.modules.household.HouseholdUpdateResponse
import at.wrk.tafel.admin.backend.modules.household.IncomeQuickCheckRequest
import at.wrk.tafel.admin.backend.modules.household.Person
import at.wrk.tafel.admin.backend.modules.household.internal.converter.HouseholdConverter
import at.wrk.tafel.admin.backend.modules.household.internal.document.DocumentStorageService
import at.wrk.tafel.admin.backend.modules.household.internal.income.IncomeValidatorPerson
import at.wrk.tafel.admin.backend.modules.household.internal.income.IncomeValidatorResult
import at.wrk.tafel.admin.backend.modules.household.internal.income.IncomeValidatorService
import at.wrk.tafel.admin.backend.modules.household.internal.masterdata.HouseholdPdfService
import org.slf4j.LoggerFactory
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.data.jpa.domain.Specification
import org.springframework.data.jpa.domain.Specification.where
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.transaction.support.TransactionSynchronization
import org.springframework.transaction.support.TransactionSynchronizationManager
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.Clock
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

@Service
class HouseholdService(
    private val incomeValidatorService: IncomeValidatorService,
    private val householdRepository: HouseholdRepository,
    private val householdPdfService: HouseholdPdfService,
    private val householdConverter: HouseholdConverter,
    private val documentStorageService: DocumentStorageService,
    private val documentRepository: DocumentRepository,
    private val distributionRepository: DistributionRepository,
    private val tafelAdminProperties: TafelAdminProperties,
    private val householdDuplicationService: HouseholdDuplicationService,
    private val auditLogWriter: AuditLogWriter,
    private val auditLogRepository: AuditLogRepository,
    private val auditActorProvider: AuditActorProvider,
    private val clock: Clock,
) {

    companion object {
        private val log = LoggerFactory.getLogger(HouseholdService::class.java)
        private val DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy")
        private val CSV_FILENAME_DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd")
        private val CSV_ROW_DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm")

        /** How far ahead the "wird bald gelöscht" filter (GDPR gap G19) looks, see [getHouseholds]. */
        private const val DELETION_PREVIEW_WINDOW_DAYS = 30L
    }

    fun validate(household: HouseholdRequest): IncomeValidatorResult = incomeValidatorService.validate(mapToValidationPersons(household.mainPerson(), household.additionalPersons()))

    /**
     * Runs the same income validation as [validate] on the bare minimum of person data, so
     * eligibility can be checked before a household's remaining data is entered at all.
     */
    fun quickCheck(request: IncomeQuickCheckRequest): IncomeValidatorResult = incomeValidatorService.validate(
        request.persons.map {
            IncomeValidatorPerson(
                birthDate = it.birthDate,
                monthlyIncome = it.income,
                receivesFamilyAllowance = it.receivesFamilyAllowance,
            )
        },
    )

    fun existsByHouseholdId(householdId: Long): Boolean = householdRepository.existsByHouseholdId(householdId)

    /**
     * The single-household lookup is the only place [HouseholdResponse.hasPrivacyNotice] gets
     * computed (the checkin screen's missing-privacy-notice warning is what needs it) - a paged
     * listing intentionally leaves it null rather than paying one `exists` query per row.
     *
     * Not read-only: this is a household detail view (`GET /api/households/{id}`) being read one
     * record at a time, so it is recorded as an `AuditOperation.READ` for the same GDPR gap G11
     * breach detection as [generatePdf] (issue #3430) - and [AuditLogWriter.record]'s write only
     * takes effect for a transaction that actually commits as one, see [AuditLogWriter]'s
     * `beforeCommit`. [recordHouseholdRead] de-duplicates per actor+household within
     * `tafeladmin.audit.readDedupeWindow`, so reloading the same screen isn't counted as a fresh read.
     */
    @Transactional
    fun findByHouseholdId(householdId: Long): HouseholdResponse? = householdRepository.findByHouseholdId(householdId)?.let {
        val hasPrivacyNotice = documentRepository.existsByHouseholdHouseholdIdAndDocumentType(householdId, DocumentType.PRIVACY_NOTICE)
        recordHouseholdRead(it)
        householdConverter.mapEntityToHousehold(it, hasPrivacyNotice)
    }

    private fun recordHouseholdRead(household: HouseholdEntity) {
        val actorUsername = auditActorProvider.currentUsername() ?: return
        val businessKey = household.householdId.toString()
        val since = LocalDateTime.now(clock).minus(tafelAdminProperties.audit.readDedupeWindow)
        val alreadyRecorded = auditLogRepository.existsByEntityTypeAndBusinessKeyAndOperationAndActorUsernameAndOccurredAtAfter(
            "Household",
            businessKey,
            AuditOperation.READ,
            actorUsername,
            since,
        )
        if (alreadyRecorded) {
            return
        }

        auditLogWriter.record(
            AuditLogWriter.PendingEntry(
                entityType = "Household",
                entityId = household.id,
                businessKey = businessKey,
                operation = AuditOperation.READ,
                changedFields = emptyMap(),
            ),
        )
    }

    /**
     * Records one bulk-report read (the above-limit/overview reports and their CSV exports), the
     * same shape [at.wrk.tafel.admin.backend.modules.audit.internal.AuditService.search] uses for
     * its own filter-as-business-key reads: no single `entityId` (the read spans every household the
     * report returned, not one), [businessKey] rendering the filter that was applied. Not
     * de-duplicated like [recordHouseholdRead] - unlike reloading one household's detail screen,
     * every distinct report/CSV pull is its own read worth a row (GDPR G24, issue #3507).
     */
    private fun recordReportRead(entityType: String, businessKey: String?) {
        auditLogWriter.record(
            AuditLogWriter.PendingEntry(
                entityType = entityType,
                entityId = null,
                businessKey = businessKey,
                operation = AuditOperation.READ,
                changedFields = emptyMap(),
            ),
        )
    }

    private fun reportBusinessKey(vararg parts: Pair<String, Any?>): String? = parts
        .mapNotNull { (key, value) -> value?.let { "$key=$it" } }
        .takeIf { it.isNotEmpty() }
        ?.joinToString(separator = ";")

    @Transactional
    fun createHousehold(household: HouseholdRequest, force: Boolean, isSupervisor: Boolean): HouseholdCreationResponse {
        if (!force) {
            checkForDuplicates(household, excludeHouseholdId = null)
        }

        val entity = householdConverter.mapHouseholdToEntity(household)

        val valid = incomeValidatorService.validate(mapToValidationPersons(household.mainPerson(), household.additionalPersons())).valid
        if (!valid && isSupervisor) {
            if (!force) {
                throw ConflictException("Einkommen befindet sich über dem Limit (Toleranz wurde bereits berücksichtigt)")
            } else {
                val savedEntity = saveWithMainPerson(entity)
                log.info("Created household {} (income above limit, forced by supervisor)", savedEntity.householdId)
                return HouseholdCreationResponse(
                    data = householdConverter.mapEntityToHousehold(savedEntity),
                    errorMsg = null,
                )
            }
        } else if (!valid) {
            // When a household is created with an invalid income - force set it invalid
            entity.validUntil = LocalDate.now().minusDays(1)
            val savedEntity = saveWithMainPerson(entity)
            log.info("Created household {} (income above limit, saved as invalid)", savedEntity.householdId)
            return HouseholdCreationResponse(
                data = householdConverter.mapEntityToHousehold(savedEntity),
                errorMsg = "Kunde wurde als ungültig gespeichert da sich das Einkommen über dem Limit befindet",
            )
        }

        val savedEntity = saveWithMainPerson(entity)
        log.info("Created household {}", savedEntity.householdId)
        return HouseholdCreationResponse(
            data = householdConverter.mapEntityToHousehold(savedEntity),
            errorMsg = null,
        )
    }

    @Transactional
    fun updateHousehold(
        householdId: Long,
        household: HouseholdRequest,
        force: Boolean,
        isSupervisor: Boolean,
    ): HouseholdUpdateResponse {
        if (!force) {
            checkForDuplicates(household, excludeHouseholdId = householdId)
        }

        val existingEntity = householdRepository.getReferenceByHouseholdId(householdId)
        val mappedEntity = householdConverter.mapHouseholdToEntity(household, existingEntity)

        val valid = incomeValidatorService.validate(mapToValidationPersons(household.mainPerson(), household.additionalPersons())).valid
        if (!valid && isSupervisor) {
            if (!force) {
                throw ConflictException("Einkommen befindet sich über dem Limit (Toleranz wurde bereits berücksichtigt)")
            } else {
                val savedEntity = saveWithMainPerson(mappedEntity)
                log.info("Updated household {} (income above limit, forced by supervisor)", savedEntity.householdId)
                return HouseholdUpdateResponse(
                    data = householdConverter.mapEntityToHousehold(savedEntity),
                    errorMsg = null,
                )
            }
        } else if (!valid) {
            // When a household is updated with an invalid income - force set it invalid
            mappedEntity.validUntil = LocalDate.now().minusDays(1)
            val savedEntity = saveWithMainPerson(mappedEntity)
            log.info("Updated household {} (income above limit, saved as invalid)", savedEntity.householdId)
            return HouseholdUpdateResponse(
                data = householdConverter.mapEntityToHousehold(savedEntity),
                errorMsg = "Kunde wurde als ungültig gespeichert da sich das Einkommen über dem Limit befindet",
            )
        }

        val savedEntity = saveWithMainPerson(mappedEntity)
        log.info("Updated household {}", savedEntity.householdId)
        return HouseholdUpdateResponse(
            data = householdConverter.mapEntityToHousehold(savedEntity),
            errorMsg = null,
        )
    }

    /**
     * `households.main_person_id` and `persons.household_id` reference each other, so a brand new
     * household and its main person can never be inserted in a single statement. The household row
     * is therefore always written first with `main_person_id = null`, then its persons, and only
     * afterwards the pointer to the main person is set (a plain UPDATE).
     */
    private fun saveWithMainPerson(entity: HouseholdEntity): HouseholdEntity {
        val mainPerson = entity.persons.firstOrNull { it.isMainPerson }

        // The main person row already exists - a single save is enough.
        if (mainPerson?.id != null) {
            entity.mainPerson = mainPerson
            return householdRepository.saveAndFlush(entity)
        }

        // Brand new main person: write the household without the pointer first, then its persons,
        // and only afterwards point the household at its main person.
        entity.mainPerson = null
        val savedEntity = householdRepository.saveAndFlush(entity)

        savedEntity.mainPerson = savedEntity.persons.firstOrNull { it.isMainPerson }
        return householdRepository.saveAndFlush(savedEntity)
    }

    /**
     * The proactive counterpart to the `/kunden/duplikate` review queue: warns before a household is
     * even written, rather than only afterwards, via [HouseholdDuplicationService.findPotentialDuplicates].
     * Reuses the same [force] flag [createHousehold]/[updateHousehold] already use for the income-limit
     * check above rather than a dedicated one - an operator who confirms "trotzdem speichern" is trusted
     * to have reviewed every warning on that save, not asked to re-confirm once per check.
     */
    private fun checkForDuplicates(household: HouseholdRequest, excludeHouseholdId: Long?) {
        val mainPerson = household.mainPerson() ?: return
        val mainPersonFirstname = mainPerson.firstname ?: return
        val mainPersonLastname = mainPerson.lastname ?: return

        val personsToCheck = household.persons.mapNotNull { person ->
            val firstname = person.firstname
            val lastname = person.lastname
            val birthDate = person.birthDate
            if (firstname != null && lastname != null && birthDate != null) {
                PersonNameAndBirthDate(firstname = firstname, lastname = lastname, birthDate = birthDate)
            } else {
                null
            }
        }

        val candidates = householdDuplicationService.findPotentialDuplicates(
            mainPersonFirstname = mainPersonFirstname,
            mainPersonLastname = mainPersonLastname,
            addressStreet = household.address.street,
            addressHouseNumber = household.address.houseNumber,
            addressDoor = household.address.door,
            persons = personsToCheck,
            excludeHouseholdId = excludeHouseholdId,
        )

        if (candidates.isNotEmpty()) {
            val matches = candidates.joinToString(", ") { "Kunde Nr. ${it.householdId} (${it.personName})" }
            throw ConflictException("Möglicherweise bereits vorhanden: $matches")
        }
    }

    /**
     * A chip filter's `Specification` (e.g. [validHousehold]) always tests the *positive* case, so a
     * `false` selection has to negate it here rather than being applied as-is - without this, `?
     * valid=false` returned only valid households, same as `?valid=true`, since both merely tested
     * "was the parameter given at all". `null` means the chip isn't applied.
     */
    private fun booleanFilterSpec(value: Boolean?, spec: Specification<HouseholdEntity>): Specification<HouseholdEntity>? = when (value) {
        true -> spec
        false -> Specification.not(spec)
        null -> null
    }

    @Transactional(readOnly = true)
    fun getHouseholds(
        searchInput: String? = null,
        page: Int?,
        filters: HouseholdSearchFilters = HouseholdSearchFilters(),
        pageSize: Int? = null,
    ): HouseholdSearchResult {
        val pageRequest = PageRequest.of(PaginationDefaults.resolvePageIndex(page), PaginationDefaults.resolvePageSize(pageSize))
        val searchTerm = SearchTextSpecs.normalize(searchInput)

        val where = where(
            Specification.allOf(
                listOfNotNull(
                    searchTextMatches(searchTerm, tafelAdminProperties.search.similarityThreshold),
                    booleanFilterSpec(filters.postProcessing, postProcessingNecessary()),
                    booleanFilterSpec(filters.costContribution, pendingCostContribution()),
                    booleanFilterSpec(filters.valid, validHousehold()),
                    booleanFilterSpec(filters.locked, lockedHousehold()),
                    booleanFilterSpec(filters.missingPrivacyNotice, missingPrivacyNoticeDocument()),
                    booleanFilterSpec(
                        filters.willBeDeletedSoon,
                        willBeDeletedSoon(tafelAdminProperties.householdDeletion.retentionTime, DELETION_PREVIEW_WINDOW_DAYS),
                    ),
                    booleanFilterSpec(
                        filters.privacyNoticeOutdated,
                        privacyNoticeRetentionDrift(tafelAdminProperties.householdDeletion.retentionTime),
                    ),
                ),
            ),
        )

        val spec = orderBySearchRelevance(searchTerm, where)
        val pagedResult = householdRepository.findAll(spec, pageRequest)

        return HouseholdSearchResult(
            items = pagedResult.map { householdConverter.mapEntityToHousehold(it) }.toList(),
            totalCount = pagedResult.totalElements,
            currentPage = page ?: 1,
            totalPages = pagedResult.totalPages,
            pageSize = pageRequest.pageSize,
        )
    }

    /**
     * The "above limit" filter can't be expressed in SQL - it depends on [IncomeValidatorService],
     * not on stored columns - so every valid household is loaded and income-validated on every page
     * view, and the result is paginated in memory. That is what keeps the list an answer about live
     * data: an income or a static value edited a second ago is reflected by the next request, with
     * nothing to invalidate. The whole run shares one rate card ([IncomeValidatorService.validateAll]),
     * so every household is measured against the same limits and the same date.
     *
     * A household the validator rejects - one whose composition has no configured income limit - is
     * logged at WARN and left out, rather than failing the whole list along with it.
     *
     * Validation therefore runs off the loaded entities (it only needs birth date, income and the
     * two flags), and only the requested page's households are mapped to a [HouseholdResponse] -
     * that mapping resolves each household's issuer, its `lockedBy` user and every person's country,
     * which for the vast majority of households the response throws away again.
     *
     * [sortBy]/[sortDirection] sort the already-computed, still unpaginated list of households above
     * the limit (see [loadHouseholdsAboveLimit]) before the page is sliced off it - there is no
     * SQL-level sort to add, since the whole list already lives in memory by the time a sort order
     * can be applied. [sortBy] takes the same column ids the frontend's `mat-sort-header`s use
     * (`totalSum`/`limit`/`amountExceededLimit`/`percentageExceededLimit`); anything else, including
     * `null`, sorts by `amountExceededLimit` - descending by default, which is what opens the review
     * queue with its worst cases first.
     *
     * Not read-only: every call records an `AuditOperation.READ` ([recordReportRead], GDPR G24,
     * issue #3507) - the response embeds full household records for everyone above the limit, not
     * one.
     */
    @Transactional
    fun getHouseholdsAboveLimit(
        page: Int? = null,
        pageSize: Int? = null,
        sortBy: String? = null,
        sortDirection: String? = null,
    ): HouseholdAboveLimitSearchResult {
        recordReportRead(AuditScope.HOUSEHOLDS_ABOVE_LIMIT_ENTITY_TYPE, reportBusinessKey("sortBy" to sortBy, "sortDirection" to sortDirection))

        val entitiesAboveLimit = loadHouseholdsAboveLimit(sortBy, sortDirection)

        val pageRequest = PageRequest.of(PaginationDefaults.resolvePageIndex(page), PaginationDefaults.resolvePageSize(pageSize))
        val fromIndex = pageRequest.offset.toInt().coerceAtMost(entitiesAboveLimit.size)
        val toIndex = (fromIndex + pageRequest.pageSize).coerceAtMost(entitiesAboveLimit.size)

        val items = entitiesAboveLimit.subList(fromIndex, toIndex).map { it.toItem() }
        val pagedResult = PageImpl(items, pageRequest, entitiesAboveLimit.size.toLong())

        return HouseholdAboveLimitSearchResult(
            items = pagedResult.content,
            totalCount = pagedResult.totalElements,
            currentPage = page ?: 1,
            totalPages = pagedResult.totalPages,
            pageSize = pageRequest.pageSize,
        )
    }

    /**
     * The CSV export exports every household above the limit, not just the current page - like
     * [at.wrk.tafel.admin.backend.modules.reporting.internal.StatisticsService.generateChildrenCsv],
     * the CSV is what gets acted on, the paginated [getHouseholdsAboveLimit] only the on-screen
     * evidence for it. Sorted the same way the list on screen was, so the export matches what a
     * reviewer was looking at.
     *
     * Not read-only, same reason as [getHouseholdsAboveLimit]: every export is its own recorded
     * `AuditOperation.READ` (GDPR G24, issue #3507).
     */
    @Transactional
    fun generateAboveLimitCsv(
        sortBy: String? = null,
        sortDirection: String? = null,
    ): HouseholdAboveLimitCsvResult {
        recordReportRead(AuditScope.HOUSEHOLDS_ABOVE_LIMIT_ENTITY_TYPE, reportBusinessKey("sortBy" to sortBy, "sortDirection" to sortDirection))

        val items = loadHouseholdsAboveLimit(sortBy, sortDirection).map { it.toItem() }

        val rows: List<List<String>> = listOf(
            listOf("Nr.", "Name", "Adresse", "Gültig bis", "Einkommen gesamt", "Limit", "Über Limit", "% über Limit"),
        ) + items.map { item ->
            val household = item.household
            listOf(
                household.id?.toString() ?: "",
                listOfNotNull(household.mainPerson()?.lastname, household.mainPerson()?.firstname).joinToString(" "),
                formatAddress(household.address),
                household.validUntil?.let { DATE_FORMATTER.format(it) } ?: "",
                item.totalSum.toPlainString(),
                item.limit.toPlainString(),
                item.amountExceededLimit.toPlainString(),
                item.percentageExceededLimit.toPlainString(),
            )
        }

        return HouseholdAboveLimitCsvResult(
            filename = "kunden_ueber_limit_${DATE_FORMATTER.format(LocalDate.now())}.csv",
            bytes = CsvUtil.writeRowsToByteArray(rows),
        )
    }

    /**
     * Matches `FormatCustomerAddressPipe` (comma-joined, "Stiege"/"Top" for stairway/door) so the
     * export reads the same as the address column shown everywhere else in the app.
     */
    private fun formatAddress(address: HouseholdAddress): String = listOfNotNull(
        listOfNotNull(address.street, address.houseNumber).joinToString(" ").trim().ifBlank { null },
        address.stairway?.trim()?.takeIf { it.isNotEmpty() }?.let { "Stiege $it" },
        address.door?.trim()?.takeIf { it.isNotEmpty() }?.let { "Top $it" },
        listOfNotNull(address.postalCode?.toString(), address.city).joinToString(" ").trim().ifBlank { null },
    ).joinToString(", ")

    private fun loadHouseholdsAboveLimit(sortBy: String?, sortDirection: String?): List<HouseholdAboveLimitEntry> {
        // households needing post-processing (missing birthDate/gender/country/address/... - see
        // HouseholdEntity.Specs.postProcessingNecessary()) can't be income-validated
        val spec = where(Specification.allOf(listOf(validHousehold(), Specification.not(postProcessingNecessary()))))
        val households = householdRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "id"))

        // one snapshot of the static values for the whole run, so every household listed here was
        // measured against the same limits even if an admin edits one while this is running
        val results = incomeValidatorService.validateAll(
            households.map { mapEntityToValidationPersons(it) },
        )

        val entitiesAboveLimit = households.zip(results).mapNotNull { (household, result) ->
            result.fold(
                onSuccess = { if (!it.valid) HouseholdAboveLimitEntry(household, it) else null },
                onFailure = {
                    // a household nobody can validate is not an answer this list can give - leaving
                    // it out keeps the review usable for every other household
                    log.warn("Household {} could not be income-validated: {}", household.householdId, it.message)
                    null
                },
            )
        }

        val comparator: Comparator<HouseholdAboveLimitEntry> = when (sortBy) {
            "totalSum" -> compareBy { it.result.totalSum }
            "limit" -> compareBy { it.result.limit }
            "percentageExceededLimit" -> compareBy { it.percentageExceededLimit() }
            else -> compareBy { it.result.amountExceededLimit }
        }
        // largest-first is the useful default for a review queue, so anything but an explicit
        // ascending request sorts descending
        return if ("asc".equals(sortDirection, ignoreCase = true)) {
            entitiesAboveLimit.sortedWith(comparator)
        } else {
            entitiesAboveLimit.sortedWith(comparator.reversed())
        }
    }

    private fun HouseholdAboveLimitEntry.toItem() = HouseholdAboveLimitItem(
        household = householdConverter.mapEntityToHousehold(household),
        totalSum = result.totalSum,
        limit = result.limit,
        amountExceededLimit = result.amountExceededLimit,
        percentageExceededLimit = percentageExceededLimit(),
    )

    /**
     * "New" and "renewed" households of a distribution, keyed off the same timestamps
     * `HouseholdConverter` already maintains: `createdAt` for new, `prolongedAt` for a
     * validity-extending save (see `HouseholdConverter.mapHouseholdToEntity`). A household created
     * *and* prolonged within the same distribution window shows up in both lists - `prolongedAt` is
     * only ever set on an update, but a freshly created household can still be updated again before
     * the distribution ends.
     *
     * Without a [distributionId] this defaults to the newest *closed* distribution - the first
     * entry of the closed-only list `GET /distributions` serves, so the frontend's default
     * selection and the default response line up.
     *
     * Not read-only: every call records an `AuditOperation.READ` ([recordReportRead], GDPR G24,
     * issue #3507) - the response embeds full household records for everyone new/renewed in the
     * distribution, not one. [generateHouseholdsOverviewCsv] calls this method directly (a
     * same-class call Spring's transaction proxy never sees), so its own recording rides along on
     * whichever transaction is already open - which is exactly why that method is not read-only
     * either.
     */
    @Transactional
    fun getHouseholdsOverview(distributionId: Long?): HouseholdOverviewResponse {
        recordReportRead(AuditScope.HOUSEHOLDS_OVERVIEW_ENTITY_TYPE, reportBusinessKey("distributionId" to distributionId))

        val distribution = if (distributionId != null) {
            distributionRepository.findById(distributionId).orElse(null)
                ?: throw NotFoundException("Ausgabe Nr. $distributionId nicht gefunden!")
        } else {
            distributionRepository.findFirstByEndedAtIsNotNullOrderByStartedAtDesc()
        }

        if (distribution == null) {
            return HouseholdOverviewResponse(
                distributionId = null,
                distributionStartedAt = null,
                distributionEndedAt = null,
                newHouseholds = emptyList(),
                renewedHouseholds = emptyList(),
            )
        }

        val fromDate = distribution.startedAt
        val toDate = distribution.endedAt ?: LocalDateTime.now()

        return HouseholdOverviewResponse(
            distributionId = distribution.id,
            distributionStartedAt = distribution.startedAt,
            distributionEndedAt = distribution.endedAt,
            newHouseholds = householdRepository.findAllByCreatedAtBetween(fromDate, toDate).map {
                HouseholdOverviewItem(household = householdConverter.mapEntityToHousehold(it), date = it.createdAt!!)
            },
            renewedHouseholds = householdRepository.findAllByProlongedAtBetween(fromDate, toDate).map {
                HouseholdOverviewItem(household = householdConverter.mapEntityToHousehold(it), date = it.prolongedAt!!)
            },
        )
    }

    /**
     * The "Neu"/"Verlängert" households of [getHouseholdsOverview] as a single CSV, matching the
     * reporting module's export conventions (`;`-delimited via [CsvUtil], `Content-Disposition:
     * inline` from the controller). One row per household, tagged with its type so the two lists
     * stay distinguishable once merged.
     *
     * Not read-only, same reason as [getHouseholdsOverview] - and has to stay that way for that
     * method's own recorded read to actually commit, since the call below is same-class (see there).
     */
    @Transactional
    fun generateHouseholdsOverviewCsv(distributionId: Long?): HouseholdOverviewCsvResult {
        val overview = getHouseholdsOverview(distributionId)

        val rows: List<List<String>> = listOf(
            listOf("Typ", "Nr.", "Name", "Adresse", "Personen", "Gültigkeit", "Datum"),
        ) +
            overview.newHouseholds.map { it.toCsvRow("Neu") } +
            overview.renewedHouseholds.map { it.toCsvRow("Verlängert") }

        val filenameDate = (overview.distributionStartedAt ?: LocalDateTime.now()).toLocalDate()
        return HouseholdOverviewCsvResult(
            filename = "kunden-uebersicht_${CSV_FILENAME_DATE_FORMATTER.format(filenameDate)}.csv",
            bytes = CsvUtil.writeRowsToByteArray(rows),
        )
    }

    private fun HouseholdOverviewItem.toCsvRow(type: String): List<String> {
        val mainPerson = household.mainPerson()
        return listOf(
            type,
            household.id?.toString() ?: "",
            listOfNotNull(mainPerson?.lastname, mainPerson?.firstname).joinToString(" "),
            formatHouseholdAddress(household.address),
            household.persons.count { !it.excludeFromHousehold }.toString(),
            householdValidityLabel(household),
            CSV_ROW_DATE_FORMATTER.format(date),
        )
    }

    private fun formatHouseholdAddress(address: HouseholdAddress): String {
        val parts = listOfNotNull(
            listOfNotNull(address.street, address.houseNumber).joinToString(" ").trim().ifBlank { null },
            address.stairway?.trim()?.ifBlank { null }?.let { "Stiege $it" },
            address.door?.trim()?.ifBlank { null }?.let { "Top $it" },
            listOfNotNull(address.postalCode?.toString(), address.city).joinToString(" ").trim().ifBlank { null },
        )
        return if (parts.isEmpty()) "-" else parts.joinToString(", ")
    }

    private fun householdValidityLabel(household: HouseholdResponse): String {
        if (household.locked == true) {
            return "Gesperrt"
        }
        val validUntil = household.validUntil ?: return "Ungültig"
        return if (!validUntil.isBefore(LocalDate.now())) "Gültig" else "Ungültig"
    }

    /**
     * Not read-only: Stammdatenblatt/ID card generation is one of the sensitive-handful reads
     * recorded in `audit_log` (see issue #3180), and [AuditLogWriter.record]'s write only takes
     * effect for a transaction that actually commits as one - see [AuditLogWriter]'s `beforeCommit`.
     */
    @Transactional
    fun generatePdf(householdId: Long, type: HouseholdPdfType): HouseholdPdfResult? {
        val household = householdRepository.findByHouseholdId(householdId)
        if (household != null) {
            auditLogWriter.record(
                AuditLogWriter.PendingEntry(
                    entityType = "Household",
                    entityId = household.id,
                    businessKey = household.householdId.toString(),
                    operation = AuditOperation.READ,
                    changedFields = emptyMap(),
                ),
            )

            val filenamePrefix: String
            val bytes: ByteArray

            when (type) {
                HouseholdPdfType.MASTERDATA -> {
                    filenamePrefix = "stammdaten"
                    bytes = householdPdfService.generateMasterdataPdf(household)
                }

                HouseholdPdfType.IDCARD -> {
                    filenamePrefix = "ausweis"
                    bytes = householdPdfService.generateIdCardPdf(household)
                }

                HouseholdPdfType.PRIVACY_NOTICE -> {
                    filenamePrefix = "datenschutzerklaerung"
                    bytes = householdPdfService.generatePrivacyNoticePdf(household)
                }
            }

            val filename = buildHouseholdFilename(filenamePrefix, household, "pdf")
            return HouseholdPdfResult(filename = filename, bytes = bytes)
        }
        return null
    }

    /**
     * The blank counterpart to [generatePdf]'s `PRIVACY_NOTICE` type - no household is read, so
     * unlike that method this is neither `@Transactional` nor audit-logged: there is nothing here
     * that is anyone's personal data.
     */
    fun generatePrivacyNoticeTemplatePdf(): HouseholdPdfResult = HouseholdPdfResult(
        filename = "datenschutzerklaerung-vorlage.pdf",
        bytes = householdPdfService.generatePrivacyNoticeTemplatePdf(),
    )

    @Transactional
    fun deleteHouseholdByHouseholdId(householdId: Long) {
        val household = householdRepository.findByHouseholdId(householdId) ?: return

        // release the main-person pointer first, otherwise deleting the persons of the household
        // would violate the households -> persons foreign key
        household.mainPerson = null
        householdRepository.saveAndFlush(household)

        // JPA cascade removes the household_documents rows, but it can't touch the files on disk -
        // those have to be cleaned up explicitly. Resolved now (the entity is gone after delete
        // below) but the files themselves are only removed once the transaction actually commits -
        // see deleteDocumentFilesAfterCommit.
        val documentStoragePaths = household.documents.map { it.storagePath }

        // household_duplicate_dismissals rows are removed by its FK's `on delete cascade` (see
        // R__00110_household_duplicate_dismissals_fk.sql), so nothing to do here explicitly.
        householdRepository.delete(household)
        // DEBUG, not INFO: HouseholdRetentionService already logs an aggregate count for its
        // nightly run, and the audit trail already records the delete itself - an INFO line per
        // household number here would only repeat that, once per row, for every deletion.
        log.debug("Deleted household {}", householdId)

        deleteDocumentFilesAfterCommit(documentStoragePaths)
    }

    /**
     * Deleting a household can be one of several steps in a single transaction - e.g. one match
     * among several in a GDPR data-subject-request delete (`DataSubjectRequestService.delete`).
     * Removing the files from disk immediately would mean a later step's failure rolls the database
     * back while the files stay gone, orphaning `household_documents` rows that point at nothing.
     * Deferring to `afterCommit` guarantees the files only disappear once the household's deletion
     * has actually landed.
     */
    private fun deleteDocumentFilesAfterCommit(storagePaths: List<String>) {
        if (storagePaths.isEmpty()) {
            return
        }
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            // No transaction to hang the cleanup off (e.g. a caller outside a Spring-managed
            // transaction) - falling back to an immediate delete is the closest available behavior.
            storagePaths.forEach { documentStorageService.delete(it) }
            return
        }
        TransactionSynchronizationManager.registerSynchronization(object : TransactionSynchronization {
            override fun afterCommit() {
                storagePaths.forEach { documentStorageService.delete(it) }
            }
        })
    }

    private fun mapToValidationPersons(mainPerson: Person?, additionalPersons: List<Person>): List<IncomeValidatorPerson> {
        val mainValidatorPerson = mainPerson?.let {
            IncomeValidatorPerson(
                birthDate = it.birthDate!!,
                monthlyIncome = it.income,
                excludeFromIncomeCalculation = false,
            )
        }

        val additionalValidatorPersons = additionalPersons.map {
            IncomeValidatorPerson(
                birthDate = it.birthDate,
                monthlyIncome = it.income,
                excludeFromIncomeCalculation = it.excludeFromHousehold,
                receivesFamilyAllowance = it.receivesFamilyAllowance,
            )
        }

        return additionalValidatorPersons + listOfNotNull(mainValidatorPerson)
    }

    /**
     * The entity-side equivalent of [mapToValidationPersons], for callers that hold
     * [HouseholdEntity] instances and have no reason to map them to a [HouseholdResponse] first.
     * Same rules: the main person never counts as excluded and never contributes a family
     * allowance, whatever its own flags say.
     */
    private fun mapEntityToValidationPersons(household: HouseholdEntity): List<IncomeValidatorPerson> {
        val mainPersonEntity = household.mainPerson ?: household.persons.firstOrNull { it.isMainPerson }

        val mainValidatorPerson = mainPersonEntity?.let {
            IncomeValidatorPerson(
                birthDate = it.birthDate,
                monthlyIncome = it.income,
                excludeFromIncomeCalculation = false,
            )
        }

        val additionalValidatorPersons = household.additionalPersons().map {
            IncomeValidatorPerson(
                birthDate = it.birthDate,
                monthlyIncome = it.income,
                excludeFromIncomeCalculation = it.excludeFromHousehold,
                receivesFamilyAllowance = it.receivesFamilyAllowance,
            )
        }

        return additionalValidatorPersons + listOfNotNull(mainValidatorPerson)
    }

    /**
     * Records a payment against the household's pending Unkostenbeitrag. A `null` amount pays off
     * the full pending amount; overpayment (amount greater than what's pending) simply clamps the
     * result at zero instead of being rejected.
     */
    @Transactional
    fun payCostContribution(householdId: Long, amount: BigDecimal?): HouseholdResponse {
        val entity = householdRepository.getReferenceByHouseholdId(householdId)
        entity.pendingCostContribution = if (amount != null) {
            (entity.pendingCostContribution - amount).coerceAtLeast(BigDecimal.ZERO)
        } else {
            BigDecimal.ZERO
        }

        val savedEntity = householdRepository.saveAndFlush(entity)
        log.info("Paid cost contribution for household {}, remaining pending amount: {}", householdId, savedEntity.pendingCostContribution)
        return householdConverter.mapEntityToHousehold(savedEntity)
    }

    /**
     * Directly sets the household's pending Unkostenbeitrag to an arbitrary value, independent of
     * any payment - e.g. to correct a wrongly recorded amount.
     */
    @Transactional
    fun editCostContribution(householdId: Long, amount: BigDecimal): HouseholdResponse {
        val entity = householdRepository.getReferenceByHouseholdId(householdId)
        entity.pendingCostContribution = amount.coerceAtLeast(BigDecimal.ZERO)

        val savedEntity = householdRepository.saveAndFlush(entity)
        log.info("Edited pending cost contribution for household {} to {}", householdId, savedEntity.pendingCostContribution)
        return householdConverter.mapEntityToHousehold(savedEntity)
    }
}

@ExcludeFromTestCoverage
data class HouseholdSearchResult(
    val items: List<HouseholdResponse>,
    val totalCount: Long,
    val currentPage: Int,
    val totalPages: Int,
    val pageSize: Int,
)

/**
 * The boolean filter chips on the customer search screen - bundled into one parameter object so
 * [HouseholdService.getHouseholds] stays under SonarQube's parameter-count limit (kotlin:S107) as
 * the filter list keeps growing. `null` on any field means "not applied", same as before.
 */
@ExcludeFromTestCoverage
data class HouseholdSearchFilters(
    val postProcessing: Boolean? = null,
    val costContribution: Boolean? = null,
    val valid: Boolean? = null,
    val locked: Boolean? = null,
    val missingPrivacyNotice: Boolean? = null,
    val willBeDeletedSoon: Boolean? = null,
    val privacyNoticeOutdated: Boolean? = null,
)

@ExcludeFromTestCoverage
data class HouseholdAboveLimitSearchResult(
    val items: List<HouseholdAboveLimitItem>,
    val totalCount: Long,
    val currentPage: Int,
    val totalPages: Int,
    val pageSize: Int,
)

/**
 * One household above the limit together with the [IncomeValidatorResult] that put it there - the
 * intermediate shape [HouseholdService.loadHouseholdsAboveLimit] sorts and slices, before either the
 * requested page or the CSV export map it into the public [HouseholdAboveLimitItem].
 */
private data class HouseholdAboveLimitEntry(
    val household: HouseholdEntity,
    val result: IncomeValidatorResult,
) {
    fun percentageExceededLimit(): BigDecimal = if (result.limit.compareTo(BigDecimal.ZERO) == 0) {
        BigDecimal.ZERO
    } else {
        result.amountExceededLimit
            .divide(result.limit, 4, RoundingMode.HALF_UP)
            .multiply(BigDecimal(100))
            .setScale(1, RoundingMode.HALF_UP)
    }
}

@ExcludeFromTestCoverage
data class HouseholdAboveLimitCsvResult(
    val filename: String,
    val bytes: ByteArray,
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as HouseholdAboveLimitCsvResult

        if (filename != other.filename) return false
        return bytes.contentEquals(other.bytes)
    }

    override fun hashCode(): Int {
        var result = filename.hashCode()
        result = 31 * result + bytes.contentHashCode()
        return result
    }
}

@ExcludeFromTestCoverage
data class HouseholdPdfResult(
    val filename: String,
    val bytes: ByteArray,
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as HouseholdPdfResult

        if (filename != other.filename) return false
        return bytes.contentEquals(other.bytes)
    }

    override fun hashCode(): Int {
        var result = filename.hashCode()
        result = 31 * result + bytes.contentHashCode()
        return result
    }
}

@ExcludeFromTestCoverage
data class HouseholdOverviewCsvResult(
    val filename: String,
    val bytes: ByteArray,
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as HouseholdOverviewCsvResult

        if (filename != other.filename) return false
        return bytes.contentEquals(other.bytes)
    }

    override fun hashCode(): Int {
        var result = filename.hashCode()
        result = 31 * result + bytes.contentHashCode()
        return result
    }
}
