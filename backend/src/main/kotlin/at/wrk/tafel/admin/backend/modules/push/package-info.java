/**
 * Web Push notifications (VAPID) - lets a user opt a browser/device in to receiving push
 * notifications, and broadcasts one to every subscribed device on events other modules care
 * about: a distribution starting ({@link at.wrk.tafel.admin.backend.modules.distribution.DistributionStartedEvent})
 * or closing ({@link at.wrk.tafel.admin.backend.modules.distribution.DistributionClosedEvent}).
 */
@org.springframework.modulith.ApplicationModule(
        allowedDependencies = {"distribution", "base::exception"}
)
package at.wrk.tafel.admin.backend.modules.push;
