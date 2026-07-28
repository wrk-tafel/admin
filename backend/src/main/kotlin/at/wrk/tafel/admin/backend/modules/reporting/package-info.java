/**
 * Statistics exports (CSV), daily reports (PDF), and age/country/household distributions.
 * Declares no allowed dependencies itself, but is a dependency target for other modules
 * (e.g. {@code distribution}) that trigger report/statistic generation.
 */
@org.springframework.modulith.ApplicationModule(
        allowedDependencies = {}
)
package at.wrk.tafel.admin.backend.modules.reporting;
