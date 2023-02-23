package at.wrk.tafel.admin.backend.modules.distribution.state

import org.springframework.context.annotation.Configuration
import org.springframework.statemachine.config.EnableStateMachine
import org.springframework.statemachine.config.StateMachineConfigurerAdapter
import org.springframework.statemachine.config.builders.StateMachineStateConfigurer
import org.springframework.statemachine.config.builders.StateMachineTransitionConfigurer

@Configuration
@EnableStateMachine
class DistributionStateMachineConfig :
    StateMachineConfigurerAdapter<DistributionState, DistributionStateTransitionEvent>() {

    override fun configure(states: StateMachineStateConfigurer<DistributionState, DistributionStateTransitionEvent>) {
        states
            .withStates()
            .initial(DistributionState.INACTIVE)
            .end(DistributionState.COMPLETED)
            .states(setOf(DistributionState.CHECKIN, DistributionState.DISTRIBUTING))
    }

    override fun configure(
        transitions: StateMachineTransitionConfigurer<DistributionState, DistributionStateTransitionEvent>
    ) {
        transitions.withExternal()
            .source(DistributionState.INACTIVE).target(DistributionState.CHECKIN)
            .event(DistributionStateTransitionEvent.CHECKIN_STARTED)
            .and().withExternal()
            .source(DistributionState.CHECKIN).target(DistributionState.DISTRIBUTING)
            .event(DistributionStateTransitionEvent.CHECKIN_ENDED)
            .event(DistributionStateTransitionEvent.DISTRIBUTION_STARTED)
            .and().withExternal()
            .source(DistributionState.DISTRIBUTING).target(DistributionState.COMPLETED)
            .event(DistributionStateTransitionEvent.DISTRIBUTION_ENDED)
            .event(DistributionStateTransitionEvent.COMPLETED)
    }

}

enum class DistributionState {
    INACTIVE, CHECKIN, DISTRIBUTING, COMPLETED;
}

enum class DistributionStateTransitionEvent {
    CHECKIN_STARTED, CHECKIN_ENDED, DISTRIBUTION_STARTED, DISTRIBUTION_ENDED, COMPLETED;
}
