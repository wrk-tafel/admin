package at.wrk.tafel.admin.backend.modules.household.internal

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.api.PaginationDefaults
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity.Specs.Companion.firstnameContains
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity.Specs.Companion.lastnameContains
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity.Specs.Companion.orderByUpdatedAtDesc
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity.Specs.Companion.pendingCostContribution
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity.Specs.Companion.postProcessingNecessary
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity.Specs.Companion.validHousehold
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.modules.base.exception.ConflictException
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.household.HouseholdAboveLimitItem
import at.wrk.tafel.admin.backend.modules.household.HouseholdCreationResponse
import at.wrk.tafel.admin.backend.modules.household.HouseholdOverviewItem
import at.wrk.tafel.admin.backend.modules.household.HouseholdOverviewResponse
import at.wrk.tafel.admin.backend.modules.household.HouseholdPdfType
import at.wrk.tafel.admin.backend.modules.household.HouseholdRequest
import at.wrk.tafel.admin.backend.modules.household.HouseholdResponse
import at.wrk.tafel.admin.backend.modules.household.HouseholdUpdateResponse
import at.wrk.tafel.admin.backend.modules.household.Person
import at.wrk.tafel.admin.backend.modules.household.internal.converter.HouseholdConverter
import at.wrk.tafel.admin.backend.modules.household.internal.document.DocumentStorageService
import at.wrk.tafel.admin.backend.modules.household.internal.income.IncomeValidatorPerson
import at.wrk.tafel.admin.backend.modules.household.internal.income.IncomeValidatorResult
import at.wrk.tafel.admin.backend.modules.household.internal.income.IncomeValidatorService
import at.wrk.tafel.admin.backend.modules.household.internal.masterdata.HouseholdPdfService
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.data.jpa.domain.Specification
import org.springframework.data.jpa.domain.Specification.where
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime

@Service
class HouseholdService(
    private val incomeValidatorService: IncomeValidatorService,
    private val householdRepository: HouseholdRepository,
    private val householdPdfService: HouseholdPdfService,
    private val householdConverter: HouseholdConverter,
    private val documentStorageService: DocumentStorageService,
    private val distributionRepository: DistributionRepository,
) {

    fun validate(household: HouseholdRequest): IncomeValidatorResult = incomeValidatorService.validate(mapToValidationPersons(household.mainPerson(), household.additionalPersons()))

    fun existsByHouseholdId(householdId: Long): Boolean = householdRepository.existsByHouseholdId(householdId)

    @Transactional(readOnly = true)
    fun findByHouseholdId(householdId: Long): HouseholdResponse? = householdRepository.findByHouseholdId(householdId)?.let { householdConverter.mapEntityToHousehold(it) }

    @Transactional
    fun createHousehold(household: HouseholdRequest, force: Boolean, isSupervisor: Boolean): HouseholdCreationResponse {
        val entity = householdConverter.mapHouseholdToEntity(household)

        val valid = incomeValidatorService.validate(mapToValidationPersons(household.mainPerson(), household.additionalPersons())).valid
        if (!valid && isSupervisor) {
            if (!force) {
                throw ConflictException("Einkommen befindet sich über dem Limit (Toleranz wurde bereits berücksichtigt)")
            } else {
                val savedEntity = saveWithMainPerson(entity)
                return HouseholdCreationResponse(
                    data = householdConverter.mapEntityToHousehold(savedEntity),
                    errorMsg = null,
                )
            }
        } else if (!valid) {
            // When a household is created with an invalid income - force set it invalid
            entity.validUntil = LocalDate.now().minusDays(1)
            val savedEntity = saveWithMainPerson(entity)
            return HouseholdCreationResponse(
                data = householdConverter.mapEntityToHousehold(savedEntity),
                errorMsg = "Kunde wurde als ungültig gespeichert da sich das Einkommen über dem Limit befindet",
            )
        }

        val savedEntity = saveWithMainPerson(entity)
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
        val existingEntity = householdRepository.getReferenceByHouseholdId(householdId)
        val mappedEntity = householdConverter.mapHouseholdToEntity(household, existingEntity)

        val valid = incomeValidatorService.validate(mapToValidationPersons(household.mainPerson(), household.additionalPersons())).valid
        if (!valid && isSupervisor) {
            if (!force) {
                throw ConflictException("Einkommen befindet sich über dem Limit (Toleranz wurde bereits berücksichtigt)")
            } else {
                val savedEntity = saveWithMainPerson(mappedEntity)
                return HouseholdUpdateResponse(
                    data = householdConverter.mapEntityToHousehold(savedEntity),
                    errorMsg = null,
                )
            }
        } else if (!valid) {
            // When a household is updated with an invalid income - force set it invalid
            mappedEntity.validUntil = LocalDate.now().minusDays(1)
            val savedEntity = saveWithMainPerson(mappedEntity)
            return HouseholdUpdateResponse(
                data = householdConverter.mapEntityToHousehold(savedEntity),
                errorMsg = "Kunde wurde als ungültig gespeichert da sich das Einkommen über dem Limit befindet",
            )
        }

        val savedEntity = saveWithMainPerson(mappedEntity)
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

    @Transactional(readOnly = true)
    fun getHouseholds(
        firstname: String? = null,
        lastname: String? = null,
        page: Int?,
        postProcessing: Boolean?,
        costContribution: Boolean?,
        valid: Boolean?,
        pageSize: Int? = null,
    ): HouseholdSearchResult {
        val pageRequest = PageRequest.of(page?.minus(1) ?: 0, PaginationDefaults.resolvePageSize(pageSize))

        val where = where(
            Specification.allOf(
                listOf(
                    firstnameContains(firstname),
                    lastnameContains(lastname),
                    if (postProcessing != null) postProcessingNecessary() else null,
                    if (costContribution != null) pendingCostContribution() else null,
                    if (valid != null) validHousehold() else null,
                ).mapNotNull { it },
            ),
        )

        val spec = orderByUpdatedAtDesc(where)
        val pagedResult = householdRepository.findAll(spec, pageRequest)

        return HouseholdSearchResult(
            items = pagedResult.map { householdConverter.mapEntityToHousehold(it) }.toList(),
            totalCount = pagedResult.totalElements,
            currentPage = page ?: 1,
            totalPages = pagedResult.totalPages,
            pageSize = pageRequest.pageSize,
        )
    }

    @Transactional(readOnly = true)
    fun getHouseholdsAboveLimit(page: Int? = null, pageSize: Int? = null): HouseholdAboveLimitSearchResult {
        // households needing post-processing (missing birthDate/gender/country/address/... - see
        // HouseholdEntity.Specs.postProcessingNecessary()) can't be income-validated
        val spec = where(Specification.allOf(listOf(validHousehold(), Specification.not(postProcessingNecessary()))))
        val households = householdRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "id"))
            .map { householdConverter.mapEntityToHousehold(it) }

        val itemsAboveLimit = households.mapNotNull { household ->
            val result = incomeValidatorService.validate(mapToValidationPersons(household.mainPerson(), household.additionalPersons()))
            if (!result.valid) {
                HouseholdAboveLimitItem(
                    household = household,
                    totalSum = result.totalSum,
                    limit = result.limit,
                    amountExceededLimit = result.amountExceededLimit,
                )
            } else {
                null
            }
        }

        // the "above limit" filter can't be expressed in SQL (it depends on IncomeValidatorService,
        // not stored columns), so pagination is applied in-memory on the already-computed result
        val pageRequest = PageRequest.of(page?.minus(1) ?: 0, PaginationDefaults.resolvePageSize(pageSize))
        val fromIndex = pageRequest.offset.toInt().coerceAtMost(itemsAboveLimit.size)
        val toIndex = (fromIndex + pageRequest.pageSize).coerceAtMost(itemsAboveLimit.size)
        val pagedResult = PageImpl(itemsAboveLimit.subList(fromIndex, toIndex), pageRequest, itemsAboveLimit.size.toLong())

        return HouseholdAboveLimitSearchResult(
            items = pagedResult.content,
            totalCount = pagedResult.totalElements,
            currentPage = page ?: 1,
            totalPages = pagedResult.totalPages,
            pageSize = pageRequest.pageSize,
        )
    }

    /**
     * "New" and "renewed" households of a distribution, keyed off the same timestamps
     * `HouseholdConverter` already maintains: `createdAt` for new, `prolongedAt` for a
     * validity-extending save (see `HouseholdConverter.mapHouseholdToEntity`). A household created
     * *and* prolonged within the same distribution window shows up in both lists - `prolongedAt` is
     * only ever set on an update, but a freshly created household can still be updated again before
     * the distribution ends.
     */
    @Transactional(readOnly = true)
    fun getHouseholdsOverview(distributionId: Long?): HouseholdOverviewResponse {
        val distribution = if (distributionId != null) {
            distributionRepository.findById(distributionId).orElse(null)
                ?: throw NotFoundException("Ausgabe Nr. $distributionId nicht gefunden!")
        } else {
            distributionRepository.findFirstByOrderByIdDesc()
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

    @Transactional(readOnly = true)
    fun generatePdf(householdId: Long, type: HouseholdPdfType): HouseholdPdfResult? {
        val household = householdRepository.findByHouseholdId(householdId)
        if (household != null) {
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
            }

            val mainPerson = household.mainPerson ?: household.persons.firstOrNull { it.isMainPerson }
            val householdName =
                listOfNotNull(
                    household.householdId,
                    mainPerson?.lastname,
                    mainPerson?.firstname,
                ).joinToString("-") { it.toString() }
            val filename = "$filenamePrefix-$householdName".lowercase().replace("[^A-Za-z0-9]".toRegex(), "-") + ".pdf"
            return HouseholdPdfResult(filename = filename, bytes = bytes)
        }
        return null
    }

    @Transactional
    fun deleteHouseholdByHouseholdId(householdId: Long) {
        val household = householdRepository.findByHouseholdId(householdId) ?: return

        // release the main-person pointer first, otherwise deleting the persons of the household
        // would violate the households -> persons foreign key
        household.mainPerson = null
        householdRepository.saveAndFlush(household)

        // JPA cascade removes the household_documents rows, but it can't touch the files on disk -
        // those have to be cleaned up explicitly.
        household.documents.forEach { documentStorageService.delete(it.storagePath) }

        householdRepository.delete(household)
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

@ExcludeFromTestCoverage
data class HouseholdAboveLimitSearchResult(
    val items: List<HouseholdAboveLimitItem>,
    val totalCount: Long,
    val currentPage: Int,
    val totalPages: Int,
    val pageSize: Int,
)

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
