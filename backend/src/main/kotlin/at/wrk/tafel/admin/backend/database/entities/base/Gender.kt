package at.wrk.tafel.admin.backend.database.entities.base

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage

@ExcludeFromTestCoverage
enum class Gender(
    val title: String
) {
    MALE("Männlich"), FEMALE("Weiblich");
}
