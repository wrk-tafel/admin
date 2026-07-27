package at.wrk.tafel.admin.backend.architecture.conditions

import com.tngtech.archunit.core.domain.JavaClass
import com.tngtech.archunit.lang.ArchCondition
import com.tngtech.archunit.lang.ConditionEvents
import com.tngtech.archunit.lang.SimpleConditionEvent
import org.springframework.web.bind.annotation.RequestMapping

/**
 * The security filter chain (see WebSecurityConfig) only requires authentication for paths
 * under `/api` - everything else is implicitly permitted. Controllers must therefore be
 * mapped under `/api` or they'd be served without any authentication check.
 */
object HaveApiRequestMappingPathCondition : ArchCondition<JavaClass>("have a @RequestMapping path starting with /api") {

    override fun check(item: JavaClass, events: ConditionEvents) {
        val requestMapping = item.tryGetAnnotationOfType(RequestMapping::class.java)
        if (!requestMapping.isPresent) {
            events.add(SimpleConditionEvent.violated(item, "${item.name} has no class-level @RequestMapping"))
            return
        }

        val paths = requestMapping.get().value.ifEmpty { requestMapping.get().path }
        if (paths.isEmpty() || paths.any { !it.startsWith("/api") }) {
            events.add(
                SimpleConditionEvent.violated(
                    item,
                    "${item.name} has @RequestMapping path(s) ${paths.toList()} not starting with /api",
                ),
            )
        }
    }
}
