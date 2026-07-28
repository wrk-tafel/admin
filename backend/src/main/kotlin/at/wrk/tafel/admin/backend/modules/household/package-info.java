/**
 * Household/person management (the case record and its members) with income validation,
 * duplicate detection, and PDF generation (ID cards, master data). Business package is
 * named {@code household} but the frontend module and DTOs are still named {@code customer}
 * on purpose - see the module README for the legacy naming and data-shape details.
 */
@org.springframework.modulith.ApplicationModule(
        allowedDependencies = {"base::country", "base::exception"}
)
package at.wrk.tafel.admin.backend.modules.household;
