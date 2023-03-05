package at.wrk.tafel.admin.backend.modules.distribution

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage
import at.wrk.tafel.admin.backend.common.model.DistributionState
import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationFailedException
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.access.prepost.PreAuthorize
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
            val distribution = service.createNewDistribution()
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
            states = states.map { mapState(it.id) }
        )
    }

    @PostMapping("/states/next")
    @PreAuthorize("hasAuthority('DISTRIBUTION')")
    fun switchToNextDistributionState(): ResponseEntity<Void> {
        val currentDistribution = service.getCurrentDistribution()
        if (currentDistribution != null) {
            service.switchToNextState(currentDistribution.state!!)
            return ResponseEntity.ok().build()
        }
        return ResponseEntity.badRequest().build()
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
            DistributionState.OPEN -> "Anmeldung öffnen"
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

@ExcludeFromTestCoverage
data class DistributionItem(
    val id: Long,
    val state: DistributionStateItem? = null
)

@ExcludeFromTestCoverage
data class DistributionStatesResponse(
    val states: List<DistributionStateItem>
)

@ExcludeFromTestCoverage
data class DistributionStateItem(
    val name: String,
    val stateLabel: String,
    val actionLabel: String?
)
