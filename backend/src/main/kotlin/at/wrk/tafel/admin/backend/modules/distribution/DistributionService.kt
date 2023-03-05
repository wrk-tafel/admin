package at.wrk.tafel.admin.backend.modules.distribution

import at.wrk.tafel.admin.backend.common.auth.model.TafelJwtAuthentication
import at.wrk.tafel.admin.backend.common.model.DistributionState
import at.wrk.tafel.admin.backend.common.model.DistributionStateTransitionEvent
import at.wrk.tafel.admin.backend.database.entities.distribution.DistributionEntity
import at.wrk.tafel.admin.backend.database.repositories.auth.UserRepository
import at.wrk.tafel.admin.backend.database.repositories.distribution.DistributionRepository
import at.wrk.tafel.admin.backend.modules.base.exception.TafelValidationFailedException
import org.springframework.messaging.support.MessageBuilder
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.statemachine.StateMachine
import org.springframework.statemachine.StateMachineEventResult
import org.springframework.statemachine.state.State
import org.springframework.stereotype.Service
import reactor.core.publisher.Mono
import java.time.ZonedDateTime

@Service
class DistributionService(
    private val distributionRepository: DistributionRepository,
    private val userRepository: UserRepository,
    private val stateMachine: StateMachine<DistributionState, DistributionStateTransitionEvent>
) {

    fun createNewDistribution(): DistributionEntity {
        val currentDistribution = distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc()
        if (currentDistribution != null) {
            throw TafelValidationFailedException("Ausgabe bereits gestartet!")
        }

        val authenticatedUser = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication

        val distribution = DistributionEntity()
        distribution.startedAt = ZonedDateTime.now()
        distribution.startedByUser = userRepository.findByUsername(authenticatedUser.username!!).orElse(null)
        distribution.state = DistributionState.OPEN

        stateMachine.startReactively().block()
        return distributionRepository.save(distribution)
    }

    fun getCurrentDistribution(): DistributionEntity? {
        return distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc()
    }

    fun getStates(): List<State<DistributionState, DistributionStateTransitionEvent>> {
        return stateMachine.transitions.flatMap { setOf(it.source, it.target) }.distinct()
    }

    fun switchToNextState(currentState: DistributionState) {
        val nextState = stateMachine.transitions
            .filter { transition ->
                transition.source.id.name == currentState.name
            }.map { transition -> transition.target.id }
            .first()
        val transitionEventToNextState = stateMachine.transitions
            .filter { transition ->
                transition.source.id.name == currentState.name
            }.map { transition -> transition.trigger.event }
            .first()

        val message = MessageBuilder.withPayload(transitionEventToNextState).build()

        val result = stateMachine.sendEvent(Mono.just(message)).blockFirst()
        if (result!!.resultType == StateMachineEventResult.ResultType.ACCEPTED) {
            saveStateToDistribution(nextState)
        }
    }

    private fun saveStateToDistribution(nextState: DistributionState) {
        val authenticatedUser = SecurityContextHolder.getContext().authentication as TafelJwtAuthentication

        val distribution = distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc()
        if (distribution != null) {
            distribution.state = nextState
            if (nextState == DistributionState.CLOSED) {
                distribution.endedAt = ZonedDateTime.now()
                distribution.endedByUser = userRepository.findByUsername(authenticatedUser.username!!).get()
            }
            distributionRepository.save(distribution)
        }
    }

}
