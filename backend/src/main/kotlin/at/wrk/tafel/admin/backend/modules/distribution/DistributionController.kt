package at.wrk.tafel.admin.backend.modules.distribution

import at.wrk.tafel.admin.backend.common.model.DistributionState
import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationException
import at.wrk.tafel.admin.backend.modules.distribution.model.*
import org.springframework.core.io.InputStreamResource
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.messaging.simp.annotation.SubscribeMapping
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*
import java.io.ByteArrayInputStream

@RestController
@RequestMapping("/api/distributions")
@MessageMapping("/distributions")
class DistributionController(
    private val service: DistributionService,
    private val simpMessagingTemplate: SimpMessagingTemplate
) {

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

    @GetMapping("/states")
    fun getDistributionStates(): DistributionStatesResponse {
        val states = service.getStates()

        return DistributionStatesResponse(
            states = states.map { mapState(it) }
        )
    }

    @PostMapping("/states/next")
    @PreAuthorize("hasAuthority('DISTRIBUTION_LCM')")
    fun switchToNextDistributionState(): ResponseEntity<Void> {
        val currentDistribution = service.getCurrentDistribution()
        if (currentDistribution != null) {
            service.switchToNextState(currentDistribution.state!!)

            // update clients about new state
            val updatedDistribution: DistributionItem? = service.getCurrentDistribution()?.let { mapDistribution(it) }
            simpMessagingTemplate.convertAndSend(
                "/topic/distributions",
                DistributionItemResponse(distribution = updatedDistribution)
            )

            return ResponseEntity.ok().build()
        }

        throw TafelValidationException("Ausgabe nicht gestartet!")
    }

    @PostMapping("/customers")
    @PreAuthorize("hasAuthority('CHECKIN')")
    fun assignCustomerToDistribution(
        @RequestBody assignCustomerRequest: AssignCustomerRequest
    ): ResponseEntity<Void> {
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

    @GetMapping("/tickets/current")
    fun getCurrentTicket(): TicketNumberResponse {
        val distribution = service.getCurrentDistribution()
            ?: throw TafelValidationException("Ausgabe nicht gestartet!")

        val currentTicket = service.getCurrentTicket(distribution)
        return TicketNumberResponse(ticketNumber = currentTicket)
    }

    @GetMapping("/tickets/next")
    fun getNextTicket(): TicketNumberResponse {
        val distribution = service.getCurrentDistribution()
            ?: throw TafelValidationException("Ausgabe nicht gestartet!")

        val nextTicket = service.closeCurrentTicketAndGetNext(distribution)
        return TicketNumberResponse(ticketNumber = nextTicket)
    }

    private fun mapState(state: DistributionState): DistributionStateItem {
        val name = state.name
        val stateLabel = mapStateToStateLabel(state)
        val actionLabel = mapStateToActionLabel(state)

        return DistributionStateItem(
            name = name,
            stateLabel = stateLabel,
            actionLabel = actionLabel
        )
    }

    private fun mapStateToStateLabel(state: DistributionState): String {
        return when (state) {
            DistributionState.OPEN -> "Geöffnet"
            DistributionState.CHECKIN -> "Anmeldung läuft"
            DistributionState.PAUSE -> "Pausiert"
            DistributionState.DISTRIBUTION -> "Verteilung läuft"
            DistributionState.CLOSED -> "Geschlossen"
        }
    }

    private fun mapStateToActionLabel(state: DistributionState): String? {
        return when (state) {
            DistributionState.OPEN -> "Anmeldung starten"
            DistributionState.CHECKIN -> "Pause"
            DistributionState.PAUSE -> "Verteilung starten"
            DistributionState.DISTRIBUTION -> "Ausgabe schließen"
            DistributionState.CLOSED -> null
        }
    }

    private fun mapDistribution(distribution: DistributionEntity): DistributionItem {
        return DistributionItem(id = distribution.id!!, state = mapState(distribution.state!!))
    }

}
