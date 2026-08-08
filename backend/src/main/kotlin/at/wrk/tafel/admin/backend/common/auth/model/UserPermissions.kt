package at.wrk.tafel.admin.backend.common.auth.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage

@ExcludeFromTestCoverage
enum class PermissionCategory(val title: String) {
    OPERATIONS("Ausgabe & Betrieb"),
    TRANSPORT("Logistik"),
    LEADERSHIP("Leitung"),
    ADMINISTRATION("Verwaltung"),
}

@ExcludeFromTestCoverage
enum class UserPermissions(val key: String, val title: String, val category: PermissionCategory) {
    CHECKIN("CHECKIN", "Anmeldung", PermissionCategory.OPERATIONS),
    DISTRIBUTION_LCM("DISTRIBUTION_LCM", "Ausgabe-Ablauf", PermissionCategory.OPERATIONS),
    USER_MANAGEMENT("USER_MANAGEMENT", "Benutzerverwaltung", PermissionCategory.LEADERSHIP),
    CUSTOMER("CUSTOMER", "Kundenverwaltung", PermissionCategory.OPERATIONS),
    CUSTOMER_DUPLICATES("CUSTOMER_DUPLICATES", "Kunden-Duplikate", PermissionCategory.ADMINISTRATION),
    CUSTOMERS_ABOVE_LIMIT("CUSTOMERS_ABOVE_LIMIT", "Kunden über dem Limit", PermissionCategory.ADMINISTRATION),
    CUSTOMERS_OVERVIEW("CUSTOMERS_OVERVIEW", "Kunden-Übersicht (Neu & Verlängert)", PermissionCategory.ADMINISTRATION),
    LOGISTICS("LOGISTICS", "Transport/Logistik", PermissionCategory.TRANSPORT),
    SCANNER("SCANNER", "Scanner", PermissionCategory.OPERATIONS),
    SETTINGS("SETTINGS", "Einstellungen", PermissionCategory.LEADERSHIP),
    STATISTICS("STATISTICS", "Statistiken", PermissionCategory.ADMINISTRATION),
    SUPERVISOR("SUPERVISOR", "Supervisor", PermissionCategory.LEADERSHIP),

    /**
     * Whoever keeps the application itself running, as opposed to running the distribution. Grants
     * every other permission implicitly - `JwtTokenService` expands it to the full list when a
     * session's token is minted, so it reaches `@PreAuthorize`, the frontend's route guards and
     * `tafelIfPermission` alike. It is also what the technical push notifications (a report mail
     * that never went out, an account locking itself) are addressed to, since those are of no use to
     * anyone who wouldn't act on them.
     *
     * Assigning it is therefore assigning everything; the user-management screens still show it as
     * the single permission it is, because only the token is expanded, never the stored account.
     */
    ADMINISTRATOR("ADMINISTRATOR", "Administrator", PermissionCategory.ADMINISTRATION),
    ;

    companion object {
        fun valueOfKey(key: String): UserPermissions = entries.first { it.key == key }
    }
}
