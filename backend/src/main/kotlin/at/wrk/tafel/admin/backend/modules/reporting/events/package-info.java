/**
 * The events {@code reporting} publishes for other modules to react to. A named interface, so a
 * listener declares {@code reporting::events} and gains access to these events alone rather than to
 * the report and statistic-export services.
 */
@org.springframework.modulith.NamedInterface("events")
package at.wrk.tafel.admin.backend.modules.reporting.events;
