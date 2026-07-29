/**
 * Statistics exports (CSV), daily reports (PDF), and age/country/household distributions.
 * Depends on {@code distribution} only for
 * {@link at.wrk.tafel.admin.backend.modules.distribution.DistributionClosedEvent}, which it listens
 * for to generate and email the daily report/statistic exports after a distribution closes.
 */
@org.springframework.modulith.ApplicationModule(
        allowedDependencies = {"distribution"}
)
package at.wrk.tafel.admin.backend.modules.reporting;
