package at.wrk.tafel.admin.backend.modules.distribution

import at.wrk.tafel.admin.backend.common.api.TafelActiveDistributionRequired
import at.wrk.tafel.admin.backend.common.http.ContentDispositionUtil
import at.wrk.tafel.admin.backend.database.common.sseoutbox.SseOutboxService
import at.wrk.tafel.admin.backend.modules.distribution.internal.DistributionService
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.*
import jakarta.validation.Valid
import org.springframework.core.io.InputStreamResource
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*
import java.io.ByteArrayInputStream

@RestController
@RequestMapping("/api/distributions")
class DistributionController(
    private val service: DistributionService,
    private val sseOutboxService: SseOutboxService,
) {

    companion object {
        const val DISTRIBUTION_UPDATE_NOTIFICATION_NAME = "distribution_update"
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    fun getDistributions(): DistributionListResponse = DistributionListResponse(items = service.getDistributionItems())

    @PostMapping("/new")
    @PreAuthorize("hasAuthority('DISTRIBUTION_LCM')")
    fun createNewDistribution(): DistributionUpdateResponse {
        val update = DistributionUpdateResponse(distribution = service.createNewDistributionItem())

        sseOutboxService.saveOutboxEntry(
            notificationName = DISTRIBUTION_UPDATE_NOTIFICATION_NAME,
            payload = update,
        )

        return update
    }

    @PostMapping("/statistics")
    @PreAuthorize("hasAuthority('LOGISTICS')")
    @TafelActiveDistributionRequired
    fun saveDistributionStatistic(@Valid @RequestBody statisticData: DistributionStatisticRequest): ResponseEntity<Unit> {
        service.updateDistributionStatisticData(statisticData.employeeCount, statisticData.selectedShelterIds)
        return ResponseEntity.ok().build()
    }

    @PostMapping("/notes")
    @PreAuthorize("isAuthenticated()")
    @TafelActiveDistributionRequired
    fun saveDistributionNotes(@Valid @RequestBody noteData: DistributionNoteRequest): ResponseEntity<Unit> {
        service.updateDistributionNoteData(noteData.notes)
        return ResponseEntity.ok().build()
    }

    /**
     * `forceClose` only overrides validation *warnings*, never hard errors: if
     * [DistributionCloseResponse.hasOnlyWarnings] is false (i.e. there's at least one real
     * error), the distribution is not closed regardless of `forceClose`, and the validation
     * result is returned instead so the caller can see why.
     */
    @PostMapping("/close")
    @PreAuthorize("hasAuthority('DISTRIBUTION_LCM')")
    @TafelActiveDistributionRequired
    fun closeDistribution(@RequestParam forceClose: Boolean = false): ResponseEntity<DistributionCloseResponse> {
        val closeValidationResult = service.validateClose()
        return if (closeValidationResult.isInvalid()) {
            if (forceClose && closeValidationResult.hasOnlyWarnings()) {
                closeAndNotify()
            } else {
                ResponseEntity.ok(closeValidationResult)
            }
        } else {
            closeAndNotify()
        }
    }

    private fun closeAndNotify(): ResponseEntity<DistributionCloseResponse> {
        service.closeDistribution()

        // update clients about new state - no active distribution
        sseOutboxService.saveOutboxEntry(
            notificationName = DISTRIBUTION_UPDATE_NOTIFICATION_NAME,
            payload = DistributionUpdateResponse(distribution = null),
        )

        return ResponseEntity.ok().build()
    }

    @PostMapping("/households")
    @PreAuthorize("hasAuthority('CHECKIN')")
    @TafelActiveDistributionRequired
    fun assignHouseholdToDistribution(
        @Valid @RequestBody assignHouseholdRequest: AssignHouseholdRequest,
    ): ResponseEntity<Unit> {
        service.assignHouseholdToDistribution(
            assignHouseholdRequest.householdId,
            assignHouseholdRequest.ticketNumber,
        )

        return ResponseEntity.noContent().build()
    }

    @GetMapping("/households/generate-pdf", produces = [MediaType.APPLICATION_PDF_VALUE])
    @PreAuthorize("isAuthenticated()")
    @TafelActiveDistributionRequired
    fun generateHouseholdListPdf(): ResponseEntity<InputStreamResource> {
        val pdfResult = service.generateHouseholdListPdf()
        pdfResult?.let {
            val headers = ContentDispositionUtil.inline(pdfResult.filename)

            return ResponseEntity
                .ok()
                .headers(headers)
                .contentType(MediaType.APPLICATION_PDF)
                .body(InputStreamResource(ByteArrayInputStream(pdfResult.bytes)))
        }
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/{distributionId}/send-mails")
    @PreAuthorize("hasAuthority('DISTRIBUTION_LCM')")
    fun sendMails(@PathVariable distributionId: Long): ResponseEntity<Unit> {
        service.sendMails(distributionId)
        return ResponseEntity.ok().build()
    }
}
