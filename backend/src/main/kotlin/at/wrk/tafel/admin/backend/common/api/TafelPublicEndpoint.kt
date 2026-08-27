package at.wrk.tafel.admin.backend.common.api

/**
 * Marks a REST handler method as deliberately reachable without authentication, so
 * `ProjectSpecificRulesTest`'s ArchUnit rule (every `@RestController` handler method needs a class-
 * or method-level `@PreAuthorize`) treats it as covered instead of flagging it. The path still has
 * to be listed in `WebSecurityConfig.publicEndpoints` for the security filter chain to actually
 * permit it - this annotation only documents/enforces the intent, it grants no access on its own.
 */
@Target(AnnotationTarget.FUNCTION)
@Retention(AnnotationRetention.RUNTIME)
@MustBeDocumented
annotation class TafelPublicEndpoint
