package at.wrk.tafel.admin.backend.modules.datasubjectrequest

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage

/**
 * Which of the three existing GDPR data-takeout areas (household/customer, staff with a `users`
 * account, staff without one) a [DataSubjectMatchItem] came from - a name collision between an
 * unrelated customer and staff member must stay visually distinct on the search screen, never
 * merged, which is what this labels for.
 */
@ExcludeFromTestCoverage
enum class DataSubjectMatchType(val title: String) {
    CUSTOMER("Kunde"),
    USER_ACCOUNT("Benutzerkonto"),
    EMPLOYEE_WITHOUT_ACCOUNT("Mitarbeiter ohne Konto"),
}
