/**
 * Routes, food collections, shelters, shops, cars, and food category management.
 * Depends on {@code base::employee} for change-tracking references (created/updated by).
 */
@org.springframework.modulith.ApplicationModule(
        allowedDependencies = {"base::exception", "base::employee"}
)
package at.wrk.tafel.admin.backend.modules.logistics;
