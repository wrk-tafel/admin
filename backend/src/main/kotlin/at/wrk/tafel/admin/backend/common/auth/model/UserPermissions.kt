package at.wrk.tafel.admin.backend.common.auth.model

import at.wrk.tafel.admin.backend.common.ExcludeFromTestCoverage

@ExcludeFromTestCoverage
enum class UserPermissions(val key: String, val title: String) {
    CHECKIN("CHECKIN", "Anmeldung"),
    DISTRIBUTION_LCM("DISTRIBUTION_LCM", "Ausgabe-Ablauf"),
    USER_MANAGEMENT("USER_MANAGEMENT", "Benutzerverwaltung"),
    CUSTOMER("CUSTOMER", "Kundenverwaltung"),
    CUSTOMER_DUPLICATES("CUSTOMER_DUPLICATES", "Kunden-Duplikate"),
    LOGISTICS("LOGISTICS", "Transport/Logistik"),
    SCANNER("SCANNER", "Scanner"),
    SETTINGS("SETTINGS", "Einstellungen");

    companion object {
        fun valueOfKey(key: String): UserPermissions {
            return entries.first { it.key == key }
        }
    }

}
