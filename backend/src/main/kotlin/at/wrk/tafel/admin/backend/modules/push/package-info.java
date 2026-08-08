/**
 * Web Push notifications (VAPID) - lets a user opt a browser/device in to receiving push
 * notifications, and broadcasts one to the subscribed devices of every user who may receive that
 * notification type and hasn't switched it off. Delivery is gated per user by what the type is for
 * (permissions, see {@code internal.PushNotificationTypeTargeting}) and by what the user asked for
 * (a master switch plus a per-type opt-out, see {@code internal.PushPreferencesService}).
 * <p>
 * The events reacted to belong to the modules that own them, which is what the dependencies below
 * are for: a distribution starting ({@link at.wrk.tafel.admin.backend.modules.distribution.DistributionStartedEvent})
 * or closing ({@link at.wrk.tafel.admin.backend.modules.distribution.DistributionClosedEvent}, used
 * both for the closing notification itself and for reporting unrecorded food collections), and a
 * report mail that could not be sent ({@link at.wrk.tafel.admin.backend.modules.reporting.ReportMailFailedEvent}).
 * Two more triggers need no module dependency: an account lockout, published from {@code common.auth},
 * and a distribution left open, which is a scheduled check rather than an event since the point is
 * that nothing happened.
 */
@org.springframework.modulith.ApplicationModule(
        allowedDependencies = {"distribution", "reporting", "base::exception"}
)
package at.wrk.tafel.admin.backend.modules.push;
