/**
 * Web Push notifications (VAPID) - lets a user opt a browser/device in to receiving push
 * notifications, and broadcasts one to the subscribed devices of every user who may receive that
 * notification type and hasn't switched it off. Delivery is gated per user by what the type is for
 * (permissions, see {@code internal.PushNotificationTypeTargeting}) and by what the user asked for
 * (a master switch plus a per-type opt-out, see {@code internal.PushPreferencesService}).
 * <p>
 * This module only ever listens - it calls no other module's services, and no module knows it
 * exists. The dependencies below are on the {@code ::events} named interfaces alone, which is as
 * narrow as the declaration can be made: an event still has to be referenced as a type to be
 * listened for, so publishing one does not decouple the listener from the class, only from the
 * publisher. Reacted to are a distribution starting or closing, the phases the day passes through in
 * between (see {@code distribution.events} and {@code logistics.events}), and a report mail that
 * could not be sent ({@code reporting.events}).
 * <p>
 * Four more triggers need no module dependency at all: an account lockout, published from
 * {@code common.auth}; a distribution left open; one user reading more sensitive data than the
 * configured threshold within an hour ({@code internal.ExcessiveReadAccessDetectionService}, reading
 * {@code database.model.audit} directly, same ambient-layer access as the distribution check reading
 * {@code database.model.distribution}) - both scheduled checks rather than events, since the point in
 * each case is that nothing else noticed; and a retention job (household/user/employee/audit) that
 * failed or refused to run past its configured ceiling, published as {@code common.retention.RetentionRunAlertEvent}
 * from each of the four retention services - three of which live in real modules (`household`,
 * `base::employee`) with their own restricted {@code allowedDependencies}, none of which lists this
 * module or `common.retention`, since only the *type* of an ambient event has to be referenced to
 * publish or listen for it, the same as {@code common.auth}'s lockout event above.
 * {@code base::exception} is the one dependency here that is not an event - the exceptions this
 * module's own controllers throw.
 */
@org.springframework.modulith.ApplicationModule(
        allowedDependencies = {"distribution::events", "logistics::events", "reporting::events", "base::exception"}
)
package at.wrk.tafel.admin.backend.modules.push;
