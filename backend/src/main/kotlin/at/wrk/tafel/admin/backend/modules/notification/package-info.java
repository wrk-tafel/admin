/**
 * The bell in the header: every user's inbox of notifications plus the announcements an
 * administrator publishes for everybody. The inbox is fed by {@code NotificationPublisher}, which
 * {@code push} calls with the recipients of a notification it also sends as a web push - so a user
 * without push enabled sees the same message the next time they open the application. Announcements
 * are created on the administrators' own screen and shown to all users, with a per-user read state.
 * <p>
 * Every change is signalled to the open sessions through the SSE outbox ({@code NotificationChangeSignal});
 * {@code NotificationsSseTopic} forwards it as the {@code notifications} topic of the tab's one event stream.
 * <p>
 * Nothing here knows {@code push}; the dependency points the other way.
 */
@org.springframework.modulith.ApplicationModule(
        allowedDependencies = {"base::exception"}
)
package at.wrk.tafel.admin.backend.modules.notification;
