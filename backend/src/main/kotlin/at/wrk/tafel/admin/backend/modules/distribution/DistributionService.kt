package at.wrk.tafel.admin.backend.modules.distribution

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.common.model.DistributionState
import at.wrk.tafel.admin.backend.common.model.DistributionStateTransitionEvent
import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.repositories.auth.UserRepository
import at.wrk.tafel.admin.backend.database.repositories.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationFailedException
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.statemachine.StateMachine
import org.springframework.statemachine.state.State
import org.springframework.stereotype.Service
import java.time.ZonedDateTime

@Service
class DistributionService(
    private val distributionRepository: DistributionRepository,
    private val userRepository: UserRepository,
    private val stateMachine: StateMachine<DistributionState, DistributionStateTransitionEvent>
) {

    fun startDistribution(): DistributionEntity {
        val currentDistribution = distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc()
        if (currentDistribution != null) {
            throw TafelValidationFailedException("Ausgabe bereits gestartet!")
        }

        val authenticatedUser = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication

        val distribution = DistributionEntity()
        distribution.startedAt = ZonedDateTime.now()
        distribution.startedByUser = userRepository.findByUsername(authenticatedUser.username!!).orElse(null)

        return distributionRepository.save(distribution)
    }

    fun getCurrentDistribution(): DistributionEntity? {
        return distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc()
    }

    fun getStates(): List<State<DistributionState, DistributionStateTransitionEvent>> {
        return stateMachine.transitions.flatMap { setOf(it.source, it.target) }.distinct()
    }

}
