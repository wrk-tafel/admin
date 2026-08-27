package at.wrk.tafel.admin.backend.architecture.conditions

import at.wrk.tafel.admin.backend.common.api.TafelPublicEndpoint
import com.tngtech.archunit.core.domain.JavaClass
import com.tngtech.archunit.core.domain.JavaModifier
import com.tngtech.archunit.lang.ArchCondition
import com.tngtech.archunit.lang.ConditionEvents
import com.tngtech.archunit.lang.SimpleConditionEvent
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestMapping

/**
 * `WebSecurityConfig`'s `anyRequest().permitAll()` makes `@PreAuthorize` the only thing standing
 * between a `@RestController` handler and an anonymous caller once a path is mapped under `/api`
 * (see [HaveApiRequestMappingPathCondition]) - nothing else enforces authorization. A handler
 * genuinely meant to be reachable without a session is marked with [TafelPublicEndpoint] instead
 * (and listed in `WebSecurityConfig.publicEndpoints` to actually be reachable).
 */
object HavePreAuthorizeOnHandlerMethodsCondition : ArchCondition<JavaClass>("have every handler method covered by @PreAuthorize or explicitly marked with @TafelPublicEndpoint") {

    private val handlerAnnotations = listOf(
        GetMapping::class.java,
        PostMapping::class.java,
        PutMapping::class.java,
        PatchMapping::class.java,
        DeleteMapping::class.java,
        RequestMapping::class.java,
    )

    override fun check(item: JavaClass, events: ConditionEvents) {
        val classLevelPreAuthorize = item.isAnnotatedWith(PreAuthorize::class.java)

        item.methods
            .filter { it.modifiers.contains(JavaModifier.PUBLIC) }
            .filter { method -> handlerAnnotations.any { method.isAnnotatedWith(it) } }
            .forEach { method ->
                val covered = classLevelPreAuthorize ||
                    method.isAnnotatedWith(PreAuthorize::class.java) ||
                    method.isAnnotatedWith(TafelPublicEndpoint::class.java)

                if (!covered) {
                    events.add(
                        SimpleConditionEvent.violated(
                            method,
                            "${method.fullName} has neither a class- nor method-level @PreAuthorize, " +
                                "nor is it annotated with @TafelPublicEndpoint",
                        ),
                    )
                }
            }
    }
}
