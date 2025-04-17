package at.wrk.tafel.admin.backend.modules.distribution

import at.wrk.tafel.admin.backend.common.sse.SseUtil
import at.wrk.tafel.admin.backend.database.common.sse_outbox.SseOutboxService
import at.wrk.tafel.admin.backend.database.model.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.modules.distribution.internal.DistributionService
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.AssignCustomerRequest
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.DistributionItem
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.DistributionItemUpdate
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.DistributionNoteData
import at.wrk.tafel.admin.backend.modules.distribution.internal.model.DistributionStatisticData
import org.springframework.core.io.InputStreamResource
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter
import java.io.ByteArrayInputStream

@RestController
@RequestMapping("/api")
class DistributionController(
    private val service: DistributionService,
    private val sseOutboxService: SseOutboxService,
) {

    companion object {
        const val DISTRIBUTION_UPDATE_NOTIFICATION_NAME = "distribution_update"
    }

    @PostMapping("/distributions/new")
    @PreAuthorize("hasAuthority('DISTRIBUTION_LCM')")
    fun createNewDistribution(): DistributionItemUpdate {
        val distribution = service.createNewDistribution()
        val update = DistributionItemUpdate(distribution = mapDistribution(distribution))

        sseOutboxService.saveOutboxEntry(
            notificationName = DISTRIBUTION_UPDATE_NOTIFICATION_NAME,
            payload = update
        )

        return update
    }

    @GetMapping("/sse/distributions")
    fun listenForDistributionUpdates(): SseEmitter {
        val sseEmitter = SseUtil.createSseEmitter()

        // initial data
        val distribution = service.getCurrentDistribution()
        sseOutboxService.sendEvent(
            sseEmitter,
            DistributionItemUpdate(distribution = distribution?.let { mapDistribution(it) })
        )

        sseOutboxService.forwardNotificationEventsToSse(
            sseEmitter = sseEmitter,
            notificationName = DISTRIBUTION_UPDATE_NOTIFICATION_NAME,
            resultType = DistributionItemUpdate::class.java
        )

        return sseEmitter
    }

    @PostMapping("/distributions/statistics")
    @PreAuthorize("hasAuthority('LOGISTICS')")
    fun saveDistributionStatistic(@RequestBody statisticData: DistributionStatisticData): ResponseEntity<Unit> {
        service.updateDistributionStatisticData(statisticData.employeeCount, statisticData.selectedShelterIds)
        return ResponseEntity.ok().build()
    }

    @PostMapping("/distributions/notes")
    @PreAuthorize("isAuthenticated()")
    fun saveDistributionNotes(@RequestBody noteData: DistributionNoteData): ResponseEntity<Unit> {
        service.updateDistributionNoteData(noteData.notes)
        return ResponseEntity.ok().build()
    }

    @PostMapping("/distributions/close")
    @PreAuthorize("hasAuthority('DISTRIBUTION_LCM')")
    fun closeDistribution(): ResponseEntity<Unit> {
        service.closeDistribution()

        // update clients about new state
        sseOutboxService.saveOutboxEntry(
            notificationName = DISTRIBUTION_UPDATE_NOTIFICATION_NAME,
            payload = DistributionItemUpdate(distribution = null)
        )

        return ResponseEntity.ok().build()
    }

    @PostMapping("/distributions/customers")
    @PreAuthorize("hasAuthority('CHECKIN')")
    fun assignCustomerToDistribution(
        @RequestBody assignCustomerRequest: AssignCustomerRequest,
    ): ResponseEntity<Unit> {
        service.assignCustomerToDistribution(
            assignCustomerRequest.customerId,
            assignCustomerRequest.ticketNumber,
            assignCustomerRequest.costContributionPaid
        )

        return ResponseEntity.noContent().build()
    }

    @GetMapping("/distributions/customers/generate-pdf", produces = [MediaType.APPLICATION_PDF_VALUE])
    fun generateCustomerListPdf(): ResponseEntity<InputStreamResource> {
        val pdfResult = service.generateCustomerListPdf()
        pdfResult?.let {
            val headers = HttpHeaders()
            headers.add(
                HttpHeaders.CONTENT_DISPOSITION,
                "inline; filename=${pdfResult.filename}"
            )

            return ResponseEntity
                .ok()
                .headers(headers)
                .contentType(MediaType.APPLICATION_PDF)
                .body(InputStreamResource(ByteArrayInputStream(pdfResult.bytes)))
        }
        return ResponseEntity.noContent().build()
    }

    private fun mapDistribution(distribution: DistributionEntity): DistributionItem {
        return DistributionItem(id = distribution.id!!)
    }

}
