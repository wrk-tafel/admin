package at.wrk.tafel.admin.backend.database.common.lock

enum class AdvisoryLockKey(val lockId: Long) {
    CREATE_DISTRIBUTION(1000L),
    CLOSE_DISTRIBUTION(2000L),

    // serializes concurrent login-failure updates across instances
    LOGIN_ATTEMPT_TRACKING(3000L),

    // serializes concurrent IP-scoped login-failure updates across instances - see LOGIN_ATTEMPT_TRACKING
    LOGIN_ATTEMPT_IP_TRACKING(3100L),

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

    // serializes the upsert-by-endpoint of a push subscription: `endpoint` is UNIQUE and the
    // upsert is a check-then-act, so overlapping registrations of one browser's endpoint would
    // otherwise both insert and the loser would fail on a duplicate key
    REGISTER_PUSH_SUBSCRIPTION(7000L),

    // serializes the ticket-number/household check-then-insert of a distribution check-in: both
    // are UNIQUE, so two desks checking in the same ticket number (or the same household) at once
    // would otherwise both pass the check and the loser would fail on a duplicate key instead of
    // getting the intended ConflictException
    ASSIGN_HOUSEHOLD_TO_DISTRIBUTION(8000L),

    // serializes the find-then-insert of a route stop's per-day completion: `(route_stop_id,
    // completion_date)` is UNIQUE, so a driver and co-driver ticking off the same stop at once
    // would otherwise both find nothing and both insert, with the loser failing on a duplicate key
    // instead of getting back the completion the other one just recorded
    ROUTE_STOP_COMPLETION(9000L),
}
