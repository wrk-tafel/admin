/**
 * The events {@code distribution} publishes for other modules to react to: the distribution being
 * started or closed, and the phases the day passes through in between.
 * <p>
 * A named interface rather than plain module-root types, so a module that only listens can say so:
 * it declares {@code distribution::events} and gains access to these events alone, not to the
 * module's services. Nothing here may reference anything from {@code distribution.internal} - an
 * event that carried an internal type would drag that type into every listener's dependency.
 */
@org.springframework.modulith.NamedInterface("events")
package at.wrk.tafel.admin.backend.modules.distribution.events;
