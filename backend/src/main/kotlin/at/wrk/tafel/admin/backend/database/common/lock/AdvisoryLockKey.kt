package at.wrk.tafel.admin.backend.database.common.lock

enum class AdvisoryLockKey(val lockId: Long) {
    CREATE_DISTRIBUTION(1000L),
    CLOSE_DISTRIBUTION(2000L),

    // serializes concurrent login-failure updates across instances
    LOGIN_ATTEMPT_TRACKING(3000L),

    // serializes read-modify-write updates to a food collection's items to avoid
    // duplicate-key races when multiple patches for the same route/shop overlap
    PATCH_FOOD_COLLECTION_ITEM(4000L),
}
