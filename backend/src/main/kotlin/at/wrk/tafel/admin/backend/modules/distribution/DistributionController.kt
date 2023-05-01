package at.wrk.tafel.admin.backend.modules.distribution

import at.wrk.tafel.admin.backend.common.model.DistributionState
import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.modules.base.exception.TafelException
import org.springframework.http.ResponseEntity
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.messaging.simp.annotation.SubscribeMapping
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.*

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

        throw TafelException("Ausgabe nicht gestartet!")
    }

    @PostMapping("/customers")
    @PreAuthorize("hasAuthority('CHECKIN')")
    fun assignCustomerToDistribution(
        @RequestBody assignCustomerRequest: AssignCustomerRequest
    ): ResponseEntity<Void> {
        val currentDistribution = service.getCurrentDistribution() ?: throw TafelException("Ausgabe nicht gestartet!")

        service.assignCustomerToDistribution(
            currentDistribution,
            assignCustomerRequest.customerId,
            assignCustomerRequest.ticketNumber
        )

        return ResponseEntity.noContent().build()
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
