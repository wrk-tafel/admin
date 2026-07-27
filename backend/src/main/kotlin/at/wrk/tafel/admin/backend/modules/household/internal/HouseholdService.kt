package at.wrk.tafel.admin.backend.modules.household.internal

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity.Specs.Companion.firstnameContains
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity.Specs.Companion.lastnameContains
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity.Specs.Companion.orderByUpdatedAtDesc
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity.Specs.Companion.pendingCostContribution
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity.Specs.Companion.postProcessingNecessary
import at.wrk.tafel.admin.backend.database.model.household.HouseholdEntity.Specs.Companion.validHousehold
import at.wrk.tafel.admin.backend.database.model.household.HouseholdRepository
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import at.wrk.tafel.admin.backend.modules.household.Household
import at.wrk.tafel.admin.backend.modules.household.HouseholdAboveLimitItem
import at.wrk.tafel.admin.backend.modules.household.HouseholdCreationResponse
import at.wrk.tafel.admin.backend.modules.household.HouseholdPdfType
import at.wrk.tafel.admin.backend.modules.household.HouseholdUpdateResponse
import at.wrk.tafel.admin.backend.modules.household.internal.converter.HouseholdConverter
import at.wrk.tafel.admin.backend.modules.household.internal.income.IncomeValidatorPerson
import at.wrk.tafel.admin.backend.modules.household.internal.income.IncomeValidatorResult
import at.wrk.tafel.admin.backend.modules.household.internal.income.IncomeValidatorService
import at.wrk.tafel.admin.backend.modules.household.internal.masterdata.HouseholdPdfService
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.PageRequest
import org.springframework.data.jpa.domain.Specification
import org.springframework.data.jpa.domain.Specification.where
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate

@Service
class HouseholdService(
    private val incomeValidatorService: IncomeValidatorService,
    private val householdRepository: HouseholdRepository,
    private val householdPdfService: HouseholdPdfService,
    private val householdConverter: HouseholdConverter
) {

    fun validate(household: Household): IncomeValidatorResult {
        return incomeValidatorService.validate(mapToValidationPersons(household))
    }

    fun existsByHouseholdId(householdId: Long): Boolean {
        return householdRepository.existsByHouseholdId(householdId)
    }

    @Transactional
    fun findByHouseholdId(householdId: Long): Household? {
        return householdRepository.findByHouseholdId(householdId)?.let { householdConverter.mapEntityToHousehold(it) }
    }

    @Transactional
    fun createHousehold(household: Household, force: Boolean, isSupervisor: Boolean): HouseholdCreationResponse {
        val entity = householdConverter.mapHouseholdToEntity(household)

        val valid = incomeValidatorService.validate(mapToValidationPersons(household)).valid
        if (!valid && isSupervisor) {
            if (!force) {
                throw TafelValidationException(
                    message = "Einkommen befindet sich über dem Limit (Toleranz wurde bereits berücksichtigt)",
                    status = HttpStatus.CONFLICT
                )
            } else {
                val savedEntity = saveWithMainPerson(entity)
                return HouseholdCreationResponse(
                    data = householdConverter.mapEntityToHousehold(savedEntity),
                    errorMsg = null
                )
            }
        } else if (!valid) {
            // When a household is created with an invalid income - force set it invalid
            entity.validUntil = LocalDate.now().minusDays(1)
            val savedEntity = saveWithMainPerson(entity)
            return HouseholdCreationResponse(
                data = householdConverter.mapEntityToHousehold(savedEntity),
                errorMsg = "Kunde wurde als ungültig gespeichert da sich das Einkommen über dem Limit befindet"
            )
        }

        val savedEntity = saveWithMainPerson(entity)
        return HouseholdCreationResponse(
            data = householdConverter.mapEntityToHousehold(savedEntity),
            errorMsg = null
        )
    }

    @Transactional
    fun updateHousehold(
        householdId: Long,
        household: Household,
        force: Boolean,
        isSupervisor: Boolean
    ): HouseholdUpdateResponse {
        val existingEntity = householdRepository.getReferenceByHouseholdId(householdId)
        val mappedEntity = householdConverter.mapHouseholdToEntity(household, existingEntity)

        val valid = incomeValidatorService.validate(mapToValidationPersons(household)).valid
        if (!valid && isSupervisor) {
            if (!force) {
                throw TafelValidationException(
                    message = "Einkommen befindet sich über dem Limit (Toleranz wurde bereits berücksichtigt)",
                    status = HttpStatus.CONFLICT
                )
            } else {
                val savedEntity = saveWithMainPerson(mappedEntity)
                return HouseholdUpdateResponse(
                    data = householdConverter.mapEntityToHousehold(savedEntity),
                    errorMsg = null
                )
            }
        } else if (!valid) {
            // When a household is updated with an invalid income - force set it invalid
            mappedEntity.validUntil = LocalDate.now().minusDays(1)
            val savedEntity = saveWithMainPerson(mappedEntity)
            return HouseholdUpdateResponse(
                data = householdConverter.mapEntityToHousehold(savedEntity),
                errorMsg = "Kunde wurde als ungültig gespeichert da sich das Einkommen über dem Limit befindet"
            )
        }

        val savedEntity = saveWithMainPerson(mappedEntity)
        return HouseholdUpdateResponse(
            data = householdConverter.mapEntityToHousehold(savedEntity),
            errorMsg = null
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

    @Transactional
    fun getHouseholds(
        firstname: String? = null,
        lastname: String? = null,
        page: Int?,
        postProcessing: Boolean?,
        costContribution: Boolean?,
        valid: Boolean?,
    ): HouseholdSearchResult {
        val pageRequest = PageRequest.of(page?.minus(1) ?: 0, 25)

        val where = where(
            Specification.allOf(
                listOf(
                    firstnameContains(firstname),
                    lastnameContains(lastname),
                    if (postProcessing != null) postProcessingNecessary() else null,
                    if (costContribution != null) pendingCostContribution() else null,
                    if (valid != null) validHousehold() else null,
                ).mapNotNull { it }
            )
        )

        val spec = orderByUpdatedAtDesc(where)
        val pagedResult = householdRepository.findAll(spec, pageRequest)

        return HouseholdSearchResult(
            items = pagedResult.map { householdConverter.mapEntityToHousehold(it) }.toList(),
            totalCount = pagedResult.totalElements,
            currentPage = page ?: 1,
            totalPages = pagedResult.totalPages,
            pageSize = pageRequest.pageSize
        )
    }

    @Transactional
    fun getHouseholdsAboveLimit(page: Int? = null): HouseholdAboveLimitSearchResult {
        // households needing post-processing (missing birthDate/gender/country/address/... - see
        // HouseholdEntity.Specs.postProcessingNecessary()) can't be income-validated
        val spec = where(Specification.allOf(listOf(validHousehold(), Specification.not(postProcessingNecessary()))))
        val households = householdRepository.findAll(spec)
            .map { householdConverter.mapEntityToHousehold(it) }

        val itemsAboveLimit = households.mapNotNull { household ->
            val result = incomeValidatorService.validate(mapToValidationPersons(household))
            if (!result.valid) {
                HouseholdAboveLimitItem(
                    household = household,
                    totalSum = result.totalSum,
                    limit = result.limit,
                    amountExceededLimit = result.amountExceededLimit
                )
            } else {
                null
            }
        }

        // the "above limit" filter can't be expressed in SQL (it depends on IncomeValidatorService,
        // not stored columns), so pagination is applied in-memory on the already-computed result
        val pageRequest = PageRequest.of(page?.minus(1) ?: 0, 25)
        val fromIndex = pageRequest.offset.toInt().coerceAtMost(itemsAboveLimit.size)
        val toIndex = (fromIndex + pageRequest.pageSize).coerceAtMost(itemsAboveLimit.size)
        val pagedResult = PageImpl(itemsAboveLimit.subList(fromIndex, toIndex), pageRequest, itemsAboveLimit.size.toLong())

        return HouseholdAboveLimitSearchResult(
            items = pagedResult.content,
            totalCount = pagedResult.totalElements,
            currentPage = page ?: 1,
            totalPages = pagedResult.totalPages,
            pageSize = pageRequest.pageSize
        )
    }

    @Transactional
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

                HouseholdPdfType.COMBINED -> {
                    filenamePrefix = "stammdaten-ausweis"
                    bytes = householdPdfService.generateCombinedPdf(household)
                }
            }

            val mainPerson = household.mainPerson ?: household.persons.firstOrNull { it.isMainPerson }
            val householdName =
                listOfNotNull(
                    household.householdId,
                    mainPerson?.lastname,
                    mainPerson?.firstname
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

        householdRepository.delete(household)
    }

    private fun mapToValidationPersons(household: Household): List<IncomeValidatorPerson> {
        val mainPerson = household.mainPerson()
        val mainValidatorPerson = mainPerson?.let {
            IncomeValidatorPerson(
                birthDate = it.birthDate!!,
                monthlyIncome = it.income,
                excludeFromIncomeCalculation = false
            )
        }

        val additionalValidatorPersons = household.additionalPersons().map {
            IncomeValidatorPerson(
                birthDate = it.birthDate,
                monthlyIncome = it.income,
                excludeFromIncomeCalculation = it.excludeFromHousehold,
                receivesFamilyBonus = it.receivesFamilyBonus
            )
        }

        return additionalValidatorPersons + listOfNotNull(mainValidatorPerson)
    }

    @Transactional
    fun mergeHouseholds(targetHousehold: Long, sourceHouseholds: List<Long>) {
        sourceHouseholds.forEach { householdId ->
            deleteHouseholdByHouseholdId(householdId)
        }
    }

}

@ExcludeFromTestCoverage
data class HouseholdSearchResult(
    val items: List<Household>,
    val totalCount: Long,
    val currentPage: Int,
    val totalPages: Int,
    val pageSize: Int
)

@ExcludeFromTestCoverage
data class HouseholdAboveLimitSearchResult(
    val items: List<HouseholdAboveLimitItem>,
    val totalCount: Long,
    val currentPage: Int,
    val totalPages: Int,
    val pageSize: Int
)

@ExcludeFromTestCoverage
data class HouseholdPdfResult(
    val filename: String,
    val bytes: ByteArray
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
