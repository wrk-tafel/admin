/**
 * Real-time overview page: distribution state, registered customers, and food amounts,
 * delivered to the frontend via Server-Sent Events. Has no allowed dependencies on other
 * application modules; cross-module data is consumed via Spring Modulith event publication
 * rather than direct calls.
 */
@org.springframework.modulith.ApplicationModule(
        allowedDependencies = {}
)
package at.wrk.tafel.admin.backend.modules.dashboard;
