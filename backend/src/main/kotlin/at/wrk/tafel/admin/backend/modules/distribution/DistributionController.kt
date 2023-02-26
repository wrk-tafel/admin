package at.wrk.tafel.admin.backend.modules.distribution

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.model.DistributionState
import at.wrk.tafel.admin.backend.common.model.DistributionStateTransitionEvent
import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationFailedException
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.statemachine.state.State
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException

@RestController
@RequestMapping("/api/distributions")
class DistributionController(
    private val service: DistributionService
) {

    @PostMapping("/new")
    @PreAuthorize("hasAuthority('DISTRIBUTION')")
    fun createNewDistribution(): DistributionItem {
        try {
            val distribution = service.startDistribution()
            return mapDistribution(distribution)
        } catch (e: TafelValidationFailedException) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, e.message)
        }
    }

    @GetMapping("/current")
    fun getCurrentDistribution(): ResponseEntity<DistributionItem> {
        val distribution = service.getCurrentDistribution()
        if (distribution != null) {
            return ResponseEntity.ok(mapDistribution(distribution))
        }

        return ResponseEntity.noContent().build()
    }

    @GetMapping("/states")
    fun getDistributionStates(): DistributionStatesResponse {
        val states = service.getStates()
        return DistributionStatesResponse(
            states = states.map { mapState(it) }
        )
    }

    private fun mapState(state: State<DistributionState, DistributionStateTransitionEvent>): DistributionStateItem {
        val name = state.id.name
        val stateLabel = mapStateToStateLabel(state.id)
        val actionLabel = mapStateToActionLabel(state.id)

        return DistributionStateItem(
            name = name,
            stateLabel = stateLabel,
            actionLabel = actionLabel
        )
    }

    private fun mapStateToStateLabel(state: DistributionState): String {
        return when (state) {
            DistributionState.OPEN -> "Offen"
            DistributionState.CHECKIN -> "Anmeldung"
            DistributionState.PAUSE -> "Pause"
            DistributionState.DISTRIBUTION -> "Verteilung"
            DistributionState.CLOSED -> "Geschlossen"
        }
    }

    private fun mapStateToActionLabel(state: DistributionState): String {
        return when (state) {
            DistributionState.OPEN -> "Ausgabe öffnen"
            DistributionState.CHECKIN -> "Anmeldung öffnen"
            DistributionState.PAUSE -> "Pause"
            DistributionState.DISTRIBUTION -> "Verteilung starten"
            DistributionState.CLOSED -> "Ausgabe schließen"
        }
    }

    private fun mapDistribution(distribution: DistributionEntity): DistributionItem {
        return DistributionItem(id = distribution.id!!)
    }

}

@ExcludeFromTestCoverage
data class DistributionItem(
    val id: Long
)

@ExcludeFromTestCoverage
data class DistributionStatesResponse(
    val states: List<DistributionStateItem>
)

@ExcludeFromTestCoverage
data class DistributionStateItem(
    val name: String,
    val stateLabel: String,
    val actionLabel: String
)
