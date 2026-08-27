package at.wrk.tafel.admin.backend.architecture

import at.wrk.tafel.admin.backend.architecture.conditions.HaveApiRequestMappingPathCondition
import at.wrk.tafel.admin.backend.architecture.conditions.HavePreAuthorizeOnHandlerMethodsCondition
import com.tngtech.archunit.core.domain.JavaClass.Predicates.resideInAPackage
import com.tngtech.archunit.junit.AnalyzeClasses
import com.tngtech.archunit.junit.ArchTest
import com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes
import com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses
import com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noMethods
import org.springframework.web.bind.annotation.RestController

@AnalyzeClasses(packages = ["at.wrk.tafel.admin.backend"])
internal class ProjectSpecificRulesTest {

    @ArchTest
    val `rest controllers should be mapped under api so the security filter chain covers them` = classes()
        .that().areAnnotatedWith(RestController::class.java)
        .should(HaveApiRequestMappingPathCondition)

    @ArchTest
    val `rest controllers should require @PreAuthorize on every handler method` = classes()
        .that().areAnnotatedWith(RestController::class.java)
        .should(HavePreAuthorizeOnHandlerMethodsCondition)

    @ArchTest
    val `rest controllers should not expose database entities directly` = noMethods()
        .that().arePublic()
        .and().areDeclaredInClassesThat().areAnnotatedWith(RestController::class.java)
        .should().haveRawReturnType(resideInAPackage("..database.model.."))
        .because("controllers should map entities to DTOs instead of returning them directly from an endpoint")

    @ArchTest
    val `rest controllers should not depend on database entities directly` = noClasses()
        .that().areAnnotatedWith(RestController::class.java)
        .should().dependOnClassesThat().resideInAPackage("..database.model..")
        .because("controllers should map entities to DTOs instead of exposing/depending on them directly")

    /**
     * `database.model` is deliberately an ambiently shared lower layer: any module may inject any
     * entity/repository from it without declaring a Spring Modulith dependency, so a named interface
     * gates a module's service/DTO surface but not its entities. That only stays a layer instead of a
     * cycle as long as the dependency points one way, which [ModularityTest] cannot check - Spring
     * Modulith only verifies the `modules` package tree.
     */
    @ArchTest
    val `database entities should not depend on feature modules` = noClasses()
        .that().resideInAPackage("..database.model..")
        .should().dependOnClassesThat().resideInAPackage("..modules..")
        .because("the shared entity layer must stay below the feature modules, never reach back up into them")
}
