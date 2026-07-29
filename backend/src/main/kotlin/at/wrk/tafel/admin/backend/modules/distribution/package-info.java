/**
 * Food distribution events: ticket management (numbers 1-999), statistics, and a
 * post-processor chain for side effects on distribution close (emails, reports).
 * Publishes {@link at.wrk.tafel.admin.backend.modules.distribution.DistributionClosedEvent}
 * for other modules (e.g. {@code reporting}) to react to, instead of calling into them directly.
 */
@org.springframework.modulith.ApplicationModule(
        allowedDependencies = {"base::exception"}
)
package at.wrk.tafel.admin.backend.modules.distribution;
