/**
 * Statistics exports (CSV), daily reports (PDF), and age/country/household distributions.
 * Depends on {@code distribution::events} only for
 * {@link at.wrk.tafel.admin.backend.modules.distribution.events.DistributionClosedEvent}, which it
 * listens for to generate and email the daily report/statistic exports after a distribution closes.
 * <p>
 * Publishes {@code reporting.events} of its own for a report mail that could not be sent.
 */
@org.springframework.modulith.ApplicationModule(
        allowedDependencies = {"distribution::events"}
)
package at.wrk.tafel.admin.backend.modules.reporting;
