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
    USER_MANAGEMENT("USER_MANAGEMENT", "Benutzerverwaltung", PermissionCategory.ADMINISTRATION),
    CUSTOMER("CUSTOMER", "Kundenverwaltung", PermissionCategory.OPERATIONS),
    CUSTOMER_DUPLICATES("CUSTOMER_DUPLICATES", "Kunden-Duplikate", PermissionCategory.ADMINISTRATION),
    CUSTOMERS_ABOVE_LIMIT("CUSTOMERS_ABOVE_LIMIT", "Kunden über dem Limit", PermissionCategory.ADMINISTRATION),
    LOGISTICS("LOGISTICS", "Transport/Logistik", PermissionCategory.TRANSPORT),
    SCANNER("SCANNER", "Scanner", PermissionCategory.OPERATIONS),
    SETTINGS("SETTINGS", "Einstellungen", PermissionCategory.ADMINISTRATION),
    STATISTICS("STATISTICS", "Statistiken", PermissionCategory.LEADERSHIP),
    SUPERVISOR("SUPERVISOR", "Supervisor", PermissionCategory.LEADERSHIP),
    ;

    companion object {
        fun valueOfKey(key: String): UserPermissions = entries.first { it.key == key }
    }
}
