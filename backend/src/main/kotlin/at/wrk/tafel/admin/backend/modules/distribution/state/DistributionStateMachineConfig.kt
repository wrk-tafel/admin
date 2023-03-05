package at.wrk.tafel.admin.backend.modules.distribution.state

import at.wrk.tafel.admin.backend.common.model.DistributionState
import at.wrk.tafel.admin.backend.common.model.DistributionStateTransitionEvent
import at.wrk.tafel.admin.backend.database.repositories.distribution.DistributionRepository
import org.springframework.context.annotation.Configuration
import org.springframework.statemachine.config.EnableStateMachine
import org.springframework.statemachine.config.StateMachineConfigurerAdapter
import org.springframework.statemachine.config.builders.StateMachineConfigurationConfigurer
import org.springframework.statemachine.config.builders.StateMachineStateConfigurer
import org.springframework.statemachine.config.builders.StateMachineTransitionConfigurer

@Configuration
@EnableStateMachine(name = ["distributionStateMachine"])
class DistributionStateMachineConfig(
    private val distributionRepository: DistributionRepository
) : StateMachineConfigurerAdapter<DistributionState, DistributionStateTransitionEvent>() {

    override fun configure(states: StateMachineStateConfigurer<DistributionState, DistributionStateTransitionEvent>) {
        val ongoingDistribution = distributionRepository.findFirstByEndedAtIsNullOrderByStartedAtDesc()

        states
            .withStates()
            .initial(
                ongoingDistribution?.state ?: DistributionState.OPEN
            )
            .end(DistributionState.CLOSED)
            .states(DistributionState.values().toSet())
    }

    override fun configure(
        transitions: StateMachineTransitionConfigurer<DistributionState, DistributionStateTransitionEvent>
    ) {
        transitions.withExternal()
            .source(DistributionState.OPEN).target(DistributionState.CHECKIN)
            .event(DistributionStateTransitionEvent.START_CHECKIN)

            .and().withExternal()
            .source(DistributionState.CHECKIN).target(DistributionState.PAUSE)
            .event(DistributionStateTransitionEvent.PAUSE)

            .and().withExternal()
            .source(DistributionState.PAUSE).target(DistributionState.DISTRIBUTION)
            .event(DistributionStateTransitionEvent.START_DISTRIBUTION)

            .and().withExternal()
            .source(DistributionState.DISTRIBUTION).target(DistributionState.CLOSED)
            .event(DistributionStateTransitionEvent.FINALIZING)
    }

    override fun configure(config: StateMachineConfigurationConfigurer<DistributionState, DistributionStateTransitionEvent>) {
        config.withConfiguration().autoStartup(true)
    }

}
