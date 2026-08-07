package at.wrk.tafel.admin.backend.database.common.lock

enum class AdvisoryLockKey(val lockId: Long) {
    CREATE_DISTRIBUTION(1000L),
    CLOSE_DISTRIBUTION(2000L),

    // serializes concurrent login-failure updates across instances
    LOGIN_ATTEMPT_TRACKING(3000L),

    // serializes read-modify-write updates to a food collection's items to avoid
    // duplicate-key races when multiple patches for the same route/shop overlap
    PATCH_FOOD_COLLECTION_ITEM(4000L),

    // serializes scanner registration's gap-filling scanner-id lookup to avoid
    // two concurrent registrations computing and inserting the same id
    SCANNER_REGISTRATION(5000L),

    // serializes the per-shop replace of a food collection's free-text return items: the whole
    // element collection is rewritten on every save, so concurrent saves for different shops of
    // the same route would otherwise drop each other's rows
    SAVE_FOOD_COLLECTION_RETURN_ITEMS(6000L),
}
