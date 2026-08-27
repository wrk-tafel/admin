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
    /**
     * Reading the audit trail - the household "Verlauf" tab as well as the global log screen.
     * Separate from `CUSTOMER` on purpose: seeing a household's current data and seeing every
     * change ever made to it, by whom, are different levels of access, and the log spans users and
     * settings too. That separation stops short of household-scoped field values (names, addresses,
     * income) though: those additionally require `CUSTOMER` - outright on the "Verlauf" tab
     * (`AuditController.getHouseholdHistory`), redacted otherwise on the global log screen
     * (`AuditService.isRedactedForCaller`) - so `AUDIT_LOG` alone only ever shows *that* a
     * household/person/note/document changed, by whom and when, never to what.
     */
    AUDIT_LOG("AUDIT_LOG", "Änderungsprotokoll", PermissionCategory.ADMINISTRATION),
    CHECKIN("CHECKIN", "Anmeldung", PermissionCategory.OPERATIONS),
    DISTRIBUTION_LCM("DISTRIBUTION_LCM", "Ausgabe-Ablauf", PermissionCategory.OPERATIONS),
    USER_MANAGEMENT("USER_MANAGEMENT", "Benutzerverwaltung", PermissionCategory.LEADERSHIP),
    CUSTOMER("CUSTOMER", "Kundenverwaltung", PermissionCategory.OPERATIONS),

    /**
     * The documents tab (uploaded ID scans, proofs of income) and the document-scanner-file import
     * behind it - `HouseholdDocumentController`/`DocumentScannerController`. Deliberately not
     * implied by `CUSTOMER`: those two controllers hold the most sensitive artefacts in the system,
     * and staff who only need to look up or edit a household's own data (e.g. check-in) do not need
     * to see a customer's ID scan (GDPR G7, issue #3181).
     */
    CUSTOMER_DOCUMENTS("CUSTOMER_DOCUMENTS", "Kunden-Dokumente", PermissionCategory.OPERATIONS),
    CUSTOMER_DUPLICATES("CUSTOMER_DUPLICATES", "Kunden-Duplikate", PermissionCategory.ADMINISTRATION),
    CUSTOMERS_ABOVE_LIMIT("CUSTOMERS_ABOVE_LIMIT", "Kunden über dem Limit", PermissionCategory.ADMINISTRATION),
    CUSTOMERS_OVERVIEW("CUSTOMERS_OVERVIEW", "Kunden-Übersicht (Neu & Verlängert)", PermissionCategory.ADMINISTRATION),

    /**
     * The central "Datenauskunft" screen (issue #3396) that searches across households, user
     * accounts and employees without one, then exports or deletes the matching record(s). Additive
     * to each area's own permission rather than replacing it: this only grants reaching the search
     * and picking a match, the export/delete action itself still requires CUSTOMER,
     * USER_MANAGEMENT or SETTINGS respectively, same as triggering it from that area's own screen.
     */
    DATA_SUBJECT_REQUESTS("DATA_SUBJECT_REQUESTS", "Datenauskunft", PermissionCategory.ADMINISTRATION),
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
