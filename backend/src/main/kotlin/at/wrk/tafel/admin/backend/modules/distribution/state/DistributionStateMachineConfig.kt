package at.wrk.tafel.admin.backend.modules.distribution.state

import at.wrk.tafel.admin.backend.common.model.DistributionState
import at.wrk.tafel.admin.backend.common.model.DistributionStateTransitionEvent
import org.springframework.context.annotation.Configuration
import org.springframework.statemachine.config.EnableStateMachine
import org.springframework.statemachine.config.StateMachineConfigurerAdapter
import org.springframework.statemachine.config.builders.StateMachineStateConfigurer
import org.springframework.statemachine.config.builders.StateMachineTransitionConfigurer

@Configuration
@EnableStateMachine(name = ["distributionStateMachine"])
class DistributionStateMachineConfig :
    StateMachineConfigurerAdapter<DistributionState, DistributionStateTransitionEvent>() {

    override fun configure(states: StateMachineStateConfigurer<DistributionState, DistributionStateTransitionEvent>) {
        states
            .withStates()
            .initial(DistributionState.OPEN)
            .end(DistributionState.CLOSED)
            .states(setOf(DistributionState.CHECKIN, DistributionState.DISTRIBUTING))
    }

    override fun configure(
        transitions: StateMachineTransitionConfigurer<DistributionState, DistributionStateTransitionEvent>
    ) {
        transitions.withExternal()
            .event(DistributionStateTransitionEvent.START_CHECKIN)
            .source(DistributionState.OPEN).target(DistributionState.CHECKIN)
            .and().withExternal()
            .event(DistributionStateTransitionEvent.START_DISTRIBUTION)
            .source(DistributionState.CHECKIN).target(DistributionState.DISTRIBUTING)
            .and().withExternal()
            .event(DistributionStateTransitionEvent.FINALIZING)
            .source(DistributionState.DISTRIBUTING).target(DistributionState.CLOSED)
    }

}
