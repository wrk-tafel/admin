package at.wrk.tafel.admin.backend.common.model

enum class DistributionState {
    OPEN, CHECKIN, DISTRIBUTING, COMPLETED;
}

enum class DistributionStateTransitionEvent {
    START_CHECKIN, START_DISTRIBUTION, COMPLETING;
}
