/**
 * Web Push notifications (VAPID) - lets a user opt a browser/device in to receiving push
 * notifications, and sends one on events other modules care about. Currently the only event
 * wired up is a distribution closing ({@link at.wrk.tafel.admin.backend.modules.distribution.DistributionClosedEvent}),
 * sent to users holding any {@code LEADERSHIP}-category permission.
 */
@org.springframework.modulith.ApplicationModule(
        allowedDependencies = {"distribution", "base::exception"}
)
package at.wrk.tafel.admin.backend.modules.push;
