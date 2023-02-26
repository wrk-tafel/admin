package at.wrk.tafel.admin.backend.common.model

enum class DistributionState {
    OPEN, CHECKIN, PAUSE, DISTRIBUTION, CLOSED;
}

enum class DistributionStateTransitionEvent {
    START_CHECKIN, PAUSE, START_DISTRIBUTION, FINALIZING;
}
