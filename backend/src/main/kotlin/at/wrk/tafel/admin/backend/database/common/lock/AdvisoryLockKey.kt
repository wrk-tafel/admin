package at.wrk.tafel.admin.backend.database.common.lock

enum class AdvisoryLockKey(val lockId: Long) {
    CREATE_DISTRIBUTION(1000L),
    CLOSE_DISTRIBUTION(2000L),

    // serializes concurrent login-failure updates across instances
    LOGIN_ATTEMPT_TRACKING(3000L)
}
