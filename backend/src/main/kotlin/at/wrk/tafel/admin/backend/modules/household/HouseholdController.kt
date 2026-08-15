package at.wrk.tafel.admin.backend.modules.household

import at.wrk.tafel.admin.backend.common.api.PagedResponse
import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.modules.base.exception.ConflictException
import at.wrk.tafel.admin.backend.modules.base.exception.NotFoundException
import at.wrk.tafel.admin.backend.modules.household.internal.HouseholdDuplicationService
import at.wrk.tafel.admin.backend.modules.household.internal.HouseholdMergeService
import at.wrk.tafel.admin.backend.modules.household.internal.HouseholdService
import at.wrk.tafel.admin.backend.modules.household.internal.income.IncomeValidatorResult
import jakarta.validation.Valid
import org.springframework.core.io.InputStreamResource
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.*
import java.io.ByteArrayInputStream

@RestController
@RequestMapping("/api/households")
class HouseholdController(
    private val householdService: HouseholdService,
    private val householdDuplicationService: HouseholdDuplicationService,
    private val householdMergeService: HouseholdMergeService,
) {
    @PostMapping("/validate")
    @PreAuthorize("hasAuthority('CUSTOMER')")
    fun validate(@Valid @RequestBody household: HouseholdRequest): ValidateHouseholdResponse =
        mapToValidateHouseholdResponse(householdService.validate(household))

    @PostMapping("/income-quickcheck")
    @PreAuthorize("hasAuthority('CUSTOMER')")
    fun incomeQuickCheck(@Valid @RequestBody request: IncomeQuickCheckRequest): ValidateHouseholdResponse =
        mapToValidateHouseholdResponse(householdService.quickCheck(request))

    private fun mapToValidateHouseholdResponse(result: IncomeValidatorResult): ValidateHouseholdResponse =
        ValidateHouseholdResponse(
            valid = result.valid,
            totalSum = result.totalSum,
            limit = result.limit,
            toleranceValue = result.toleranceValue,
            amountExceededLimit = result.amountExceededLimit,
            details = IncomeCalculationDetails(
                incomeSum = result.details.incomeSum,
                familyAllowanceSum = result.details.familyAllowanceSum,
                childTaxAllowanceSum = result.details.childTaxAllowanceSum,
                siblingAdditionSum = result.details.siblingAdditionSum,
                baseLimit = result.details.baseLimit,
                baseLimitCountAdults = result.details.baseLimitCountAdults,
                baseLimitCountChildren = result.details.baseLimitCountChildren,
                additionalAdultsCount = result.details.additionalAdultsCount,
                additionalAdultsSum = result.details.additionalAdultsSum,
                additionalChildrenCount = result.details.additionalChildrenCount,
                additionalChildrenSum = result.details.additionalChildrenSum,
            ),
        )

    @PostMapping
    @PreAuthorize("hasAuthority('CUSTOMER')")
    fun createHousehold(
        @RequestParam force: Boolean = false,
        @Valid @RequestBody household: HouseholdRequest,
    ): ResponseEntity<HouseholdCreationResponse> {
        val authenticatedUser = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication
        val isSupervisor = authenticatedUser.hasRole("SUPERVISOR")

        household.id?.let {
            if (householdService.existsByHouseholdId(it)) {
                throw ConflictException("Kunde Nr. $it bereits vorhanden!")
            }
        }

        val response = householdService.createHousehold(household, force, isSupervisor)
        return ResponseEntity.status(HttpStatus.CREATED).body(response)
    }

    @PutMapping("/{householdId}")
    @PreAuthorize("hasAuthority('CUSTOMER')")
    fun updateHousehold(
        @PathVariable householdId: Long,
        @RequestParam force: Boolean = false,
        @Valid @RequestBody household: HouseholdRequest,
    ): HouseholdUpdateResponse {
        val authenticatedUser = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication
        val isSupervisor = authenticatedUser.hasRole("SUPERVISOR")

        if (!householdService.existsByHouseholdId(householdId)) {
            throw NotFoundException("Kunde Nr. $householdId nicht vorhanden!")
        }

        return householdService.updateHousehold(householdId, household, force, isSupervisor)
    }

    @GetMapping("/{householdId}")
    @PreAuthorize("hasAuthority('CUSTOMER')")
    fun getHousehold(@PathVariable householdId: Long): HouseholdResponse = householdService.findByHouseholdId(householdId)
        ?: throw NotFoundException("Kunde Nr. $householdId nicht gefunden!")

    @GetMapping
    @PreAuthorize("hasAuthority('CUSTOMER')")
    fun getHouseholds(
        @RequestParam searchInput: String? = null,
        @RequestParam page: Int? = null,
        @RequestParam postProcessing: Boolean? = null,
        @RequestParam costContribution: Boolean? = null,
        @RequestParam valid: Boolean? = null,
        @RequestParam pageSize: Int? = null,
    ): PagedResponse<HouseholdResponse> {
        val householdSearchResult = householdService.getHouseholds(
            searchInput = searchInput,
            page = page,
            postProcessing = postProcessing,
            costContribution = costContribution,
            valid = valid,
            pageSize = pageSize,
        )
        return PagedResponse(
            items = householdSearchResult.items,
            totalCount = householdSearchResult.totalCount,
            currentPage = householdSearchResult.currentPage,
            totalPages = householdSearchResult.totalPages,
            pageSize = householdSearchResult.pageSize,
        )
    }

    @DeleteMapping("/{householdId}")
    @PreAuthorize("hasAuthority('CUSTOMER')")
    fun deleteHousehold(@PathVariable householdId: Long): ResponseEntity<Unit> {
        if (!householdService.existsByHouseholdId(householdId)) {
            throw NotFoundException("Kunde Nr. $householdId nicht vorhanden!")
        }

        householdService.deleteHouseholdByHouseholdId(householdId)
        return ResponseEntity.noContent().build()
    }

    @GetMapping("/{householdId}/generate-pdf", produces = [MediaType.APPLICATION_PDF_VALUE])
    @PreAuthorize("hasAuthority('CUSTOMER')")
    fun generatePdf(
        @PathVariable householdId: Long,
        @RequestParam("type") type: HouseholdPdfType,
    ): ResponseEntity<InputStreamResource> {
        val pdfResult = householdService.generatePdf(householdId, type)
        pdfResult?.let {
            val headers = HttpHeaders()
            headers.add(
                HttpHeaders.CONTENT_DISPOSITION,
                "inline; filename=${pdfResult.filename}",
            )

            return ResponseEntity
                .ok()
                .headers(headers)
                .contentType(MediaType.APPLICATION_PDF)
                .body(InputStreamResource(ByteArrayInputStream(pdfResult.bytes)))
        } ?: throw NotFoundException("Kunde Nr. $householdId nicht vorhanden!")
    }

    @GetMapping("/above-limit")
    @PreAuthorize("hasAuthority('CUSTOMERS_ABOVE_LIMIT')")
    fun getHouseholdsAboveLimit(
        @RequestParam page: Int? = null,
        @RequestParam pageSize: Int? = null,
        @RequestParam sortBy: String? = null,
        @RequestParam sortDirection: String? = null,
    ): PagedResponse<HouseholdAboveLimitItem> {
        val result = householdService.getHouseholdsAboveLimit(page, pageSize, sortBy, sortDirection)
        return PagedResponse(
            items = result.items,
            totalCount = result.totalCount,
            currentPage = result.currentPage,
            totalPages = result.totalPages,
            pageSize = result.pageSize,
        )
    }

    @GetMapping("/above-limit/csv", produces = [MediaType.TEXT_PLAIN_VALUE])
    @PreAuthorize("hasAuthority('CUSTOMERS_ABOVE_LIMIT')")
    fun generateHouseholdsAboveLimitCsv(
        @RequestParam sortBy: String? = null,
        @RequestParam sortDirection: String? = null,
    ): ResponseEntity<InputStreamResource> {
        val csvResult = householdService.generateAboveLimitCsv(sortBy, sortDirection)
        val headers = HttpHeaders()
        headers.add(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=${csvResult.filename}")

        return ResponseEntity
            .ok()
            .headers(headers)
            .contentType(MediaType.TEXT_PLAIN)
            .body(InputStreamResource(ByteArrayInputStream(csvResult.bytes)))
    }

    @GetMapping("/overview")
    @PreAuthorize("hasAuthority('CUSTOMERS_OVERVIEW')")
    fun getHouseholdsOverview(@RequestParam distributionId: Long? = null): HouseholdOverviewResponse = householdService.getHouseholdsOverview(distributionId)

    @GetMapping("/overview/generate-csv", produces = [MediaType.TEXT_PLAIN_VALUE])
    @PreAuthorize("hasAuthority('CUSTOMERS_OVERVIEW')")
    fun generateHouseholdsOverviewCsv(@RequestParam distributionId: Long? = null): ResponseEntity<InputStreamResource> {
        val csvResult = householdService.generateHouseholdsOverviewCsv(distributionId)
        val headers = HttpHeaders()
        headers.add(
            HttpHeaders.CONTENT_DISPOSITION,
            "inline; filename=${csvResult.filename}",
        )

        return ResponseEntity
            .ok()
            .headers(headers)
            .contentType(MediaType.TEXT_PLAIN)
            .body(InputStreamResource(ByteArrayInputStream(csvResult.bytes)))
    }

    @GetMapping("/duplicates")
    @PreAuthorize("hasAuthority('CUSTOMER_DUPLICATES')")
    fun getDuplicates(
        @RequestParam page: Int? = null,
    ): PagedResponse<HouseholdDuplicationItem> {
        val duplicateSearchResult = householdDuplicationService.findDuplicates(page)
        return PagedResponse(
            items = duplicateSearchResult.items.map {
                HouseholdDuplicationItem(
                    household = it.household,
                    similarHouseholds = it.similarHouseholds,
                )
            },
            totalCount = duplicateSearchResult.totalCount,
            currentPage = duplicateSearchResult.currentPage,
            totalPages = duplicateSearchResult.totalPages,
            pageSize = duplicateSearchResult.pageSize,
        )
    }

    @PostMapping("/duplicates/dismiss")
    @PreAuthorize("hasAuthority('CUSTOMER_DUPLICATES')")
    fun dismissDuplicate(@Valid @RequestBody request: HouseholdDuplicateDismissRequest) {
        householdDuplicationService.dismiss(request.householdId!!, request.otherHouseholdId!!)
    }

    @GetMapping("/{householdId}/merge-preview")
    @PreAuthorize("hasAuthority('CUSTOMER_DUPLICATES')")
    fun getMergePreview(
        @PathVariable householdId: Long,
        @RequestParam sourceHouseholdIds: List<Long>,
    ): HouseholdMergePreviewResponse = householdMergeService.preview(householdId, sourceHouseholdIds)

    @PostMapping("/{householdId}/merge")
    @PreAuthorize("hasAuthority('CUSTOMER_DUPLICATES')")
    fun mergeIntoHousehold(
        @PathVariable householdId: Long,
        @Valid @RequestBody request: HouseholdMergeRequest,
    ): HouseholdMergeResponse = householdMergeService.merge(householdId, request)

    @PostMapping("/{householdId}/cost-contribution/pay")
    @PreAuthorize("hasAuthority('CUSTOMER')")
    fun payCostContribution(
        @PathVariable householdId: Long,
        @Valid @RequestBody request: HouseholdCostContributionPaymentRequest,
    ): HouseholdResponse {
        if (!householdService.existsByHouseholdId(householdId)) {
            throw NotFoundException("Kunde Nr. $householdId nicht vorhanden!")
        }

        return householdService.payCostContribution(householdId, request.amount)
    }

    @PutMapping("/{householdId}/cost-contribution")
    @PreAuthorize("hasAuthority('CUSTOMER')")
    fun editCostContribution(
        @PathVariable householdId: Long,
        @Valid @RequestBody request: HouseholdCostContributionEditRequest,
    ): HouseholdResponse {
        if (!householdService.existsByHouseholdId(householdId)) {
            throw NotFoundException("Kunde Nr. $householdId nicht vorhanden!")
        }

        return householdService.editCostContribution(householdId, request.amount!!)
    }
}
