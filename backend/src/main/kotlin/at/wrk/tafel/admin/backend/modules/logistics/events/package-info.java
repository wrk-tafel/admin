/**
 * The events {@code logistics} publishes for other modules to react to. A named interface, so a
 * listener declares {@code logistics::events} and gains access to these events alone rather than to
 * the module's route, shop, car and food-collection services.
 */
@org.springframework.modulith.NamedInterface("events")
package at.wrk.tafel.admin.backend.modules.logistics.events;
