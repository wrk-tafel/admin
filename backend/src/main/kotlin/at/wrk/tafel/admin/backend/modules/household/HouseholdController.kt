package at.wrk.tafel.admin.backend.modules.household

import at.wrk.tafel.admin.backend.common.api.PagedResponse
import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import at.wrk.tafel.admin.backend.modules.household.internal.HouseholdDuplicationService
import at.wrk.tafel.admin.backend.modules.household.internal.HouseholdService
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
) {
    @PostMapping("/validate")
    @PreAuthorize("hasAuthority('CUSTOMER')")
    fun validate(@Valid @RequestBody household: Household): ValidateHouseholdResponse {
        val result = householdService.validate(household)
        return ValidateHouseholdResponse(
            valid = result.valid,
            totalSum = result.totalSum,
            limit = result.limit,
            toleranceValue = result.toleranceValue,
            amountExceededLimit = result.amountExceededLimit,
        )
    }

    @PostMapping
    @PreAuthorize("hasAuthority('CUSTOMER')")
    fun createHousehold(
        @RequestParam force: Boolean = false,
        @Valid @RequestBody household: Household,
    ): ResponseEntity<HouseholdCreationResponse> {
        val authenticatedUser = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication
        val isSupervisor = authenticatedUser.hasRole("SUPERVISOR")

        household.id?.let {
            if (householdService.existsByHouseholdId(it)) {
                throw TafelValidationException("Kunde Nr. $it bereits vorhanden!")
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
        @Valid @RequestBody household: Household,
    ): HouseholdUpdateResponse {
        val authenticatedUser = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication
        val isSupervisor = authenticatedUser.hasRole("SUPERVISOR")

        if (!householdService.existsByHouseholdId(householdId)) {
            throw TafelValidationException(
                message = "Kunde Nr. $householdId nicht vorhanden!",
                status = HttpStatus.NOT_FOUND,
            )
        }

        return householdService.updateHousehold(householdId, household, force, isSupervisor)
    }

    @GetMapping("/{householdId}")
    @PreAuthorize("hasAuthority('CUSTOMER')")
    fun getHousehold(@PathVariable householdId: Long): Household = householdService.findByHouseholdId(householdId)
        ?: throw TafelValidationException(
            message = "Kunde Nr. $householdId nicht gefunden!",
            status = HttpStatus.NOT_FOUND,
        )

    @GetMapping
    @PreAuthorize("hasAuthority('CUSTOMER')")
    fun getHouseholds(
        @RequestParam firstname: String? = null,
        @RequestParam lastname: String? = null,
        @RequestParam page: Int? = null,
        @RequestParam postProcessing: Boolean? = null,
        @RequestParam costContribution: Boolean? = null,
        @RequestParam valid: Boolean? = null,
    ): PagedResponse<Household> {
        val householdSearchResult = householdService.getHouseholds(
            firstname = firstname?.trim(),
            lastname = lastname?.trim(),
            page = page,
            postProcessing = postProcessing,
            costContribution = costContribution,
            valid = valid,
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
            throw TafelValidationException(
                message = "Kunde Nr. $householdId nicht vorhanden!",
                status = HttpStatus.NOT_FOUND,
            )
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
        } ?: throw TafelValidationException(
            message = "Kunde Nr. $householdId nicht vorhanden!",
            status = HttpStatus.NOT_FOUND,
        )
    }

    @GetMapping("/above-limit")
    @PreAuthorize("hasAuthority('CUSTOMERS_ABOVE_LIMIT')")
    fun getHouseholdsAboveLimit(
        @RequestParam page: Int? = null,
    ): PagedResponse<HouseholdAboveLimitItem> {
        val result = householdService.getHouseholdsAboveLimit(page)
        return PagedResponse(
            items = result.items,
            totalCount = result.totalCount,
            currentPage = result.currentPage,
            totalPages = result.totalPages,
            pageSize = result.pageSize,
        )
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

    @PostMapping("/{householdId}/merge")
    @PreAuthorize("hasAuthority('CUSTOMER_DUPLICATES')")
    fun mergeIntoHousehold(
        @PathVariable householdId: Long,
        @Valid @RequestBody request: HouseholdMergeRequest,
    ): ResponseEntity<Any> {
        householdService.mergeHouseholds(householdId, request.sourceHouseholdIds)
        return ResponseEntity.ok().build()
    }
}
