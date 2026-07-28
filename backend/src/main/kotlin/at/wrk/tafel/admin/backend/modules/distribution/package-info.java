/**
 * Food distribution events: ticket management (numbers 1-999), statistics, and a
 * post-processor chain for side effects on distribution close (emails, reports).
 * Depends on {@code reporting} to trigger report/statistic generation when a distribution closes.
 */
@org.springframework.modulith.ApplicationModule(
        allowedDependencies = {"base::exception", "reporting"}
)
package at.wrk.tafel.admin.backend.modules.distribution;
