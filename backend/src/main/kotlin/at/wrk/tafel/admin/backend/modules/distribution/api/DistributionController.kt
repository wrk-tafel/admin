package at.wrk.tafel.admin.backend.modules.distribution.api

import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import at.wrk.tafel.admin.backend.modules.distribution.service.internal.DistributionInternalService
import at.wrk.tafel.admin.backend.modules.distribution.api.model.AssignCustomerRequest
import at.wrk.tafel.admin.backend.modules.distribution.api.model.DistributionItem
import at.wrk.tafel.admin.backend.modules.distribution.api.model.DistributionItemResponse
import org.slf4j.LoggerFactory
import org.springframework.core.io.InputStreamResource
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.messaging.simp.annotation.SubscribeMapping
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.io.ByteArrayInputStream

@RestController
@RequestMapping("/api/distributions")
@MessageMapping("/distributions")
class DistributionController(
    private val service: DistributionInternalService,
    private val simpMessagingTemplate: SimpMessagingTemplate
) {

    companion object {
        private val logger = LoggerFactory.getLogger(DistributionController::class.java)
    }

    @Scheduled(cron = "0 50 23 * * *")
    fun autoCloseDistribution() {
        val currentDistribution = service.getCurrentDistribution()
        if (currentDistribution != null) {
            logger.info("Distribution still open - auto-closing it")
            service.closeDistribution()
        }
    }

    @PostMapping("/new")
    @PreAuthorize("hasAuthority('DISTRIBUTION_LCM')")
    fun createNewDistribution() {
        val distribution = service.createNewDistribution()

        simpMessagingTemplate.convertAndSend(
            "/topic/distributions",
            DistributionItemResponse(distribution = mapDistribution(distribution))
        )
    }

    @SubscribeMapping
    fun getCurrentDistribution(): DistributionItemResponse {
        val distribution = service.getCurrentDistribution()
        return DistributionItemResponse(distribution = distribution?.let { mapDistribution(it) })
    }

    @PostMapping("/close")
    @PreAuthorize("hasAuthority('DISTRIBUTION_LCM')")
    fun closeDistribution(): ResponseEntity<Unit> {
        service.closeDistribution()

        // update clients about new state
        simpMessagingTemplate.convertAndSend(
            "/topic/distributions",
            DistributionItemResponse(distribution = null)
        )

        return ResponseEntity.ok().build()
    }

    @PostMapping("/customers")
    @PreAuthorize("hasAuthority('CHECKIN')")
    fun assignCustomerToDistribution(
        @RequestBody assignCustomerRequest: AssignCustomerRequest
    ): ResponseEntity<Unit> {
        val currentDistribution =
            service.getCurrentDistribution() ?: throw TafelValidationException("Ausgabe nicht gestartet!")

        service.assignCustomerToDistribution(
            currentDistribution,
            assignCustomerRequest.customerId,
            assignCustomerRequest.ticketNumber
        )

        return ResponseEntity.noContent().build()
    }

    @GetMapping("/customers/generate-pdf", produces = [MediaType.APPLICATION_PDF_VALUE])
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
