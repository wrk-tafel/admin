package at.wrk.tafel.admin.backend.architecture

import at.wrk.tafel.admin.backend.architecture.conditions.HaveApiRequestMappingPathCondition
import at.wrk.tafel.admin.backend.modules.distribution.DistributionController
import at.wrk.tafel.admin.backend.modules.distribution.internal.ticket.DistributionTicketController
import at.wrk.tafel.admin.backend.modules.distribution.internal.ticket.DistributionTicketScreenController
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
    val `rest controllers should not expose database entities directly` = noMethods()
        .that().arePublic()
        .and().areDeclaredInClassesThat().areAnnotatedWith(RestController::class.java)
        .should().haveRawReturnType(resideInAPackage("..database.model.."))
        .because("controllers should map entities to DTOs instead of returning them directly from an endpoint")

    @ArchTest
    val `rest controllers should not depend on database entities directly` = noClasses()
        .that().areAnnotatedWith(RestController::class.java)
        .and().areNotAssignableTo(DistributionController::class.java)
        .and().areNotAssignableTo(DistributionTicketController::class.java)
        .and().areNotAssignableTo(DistributionTicketScreenController::class.java)
        .should().dependOnClassesThat().resideInAPackage("..database.model..")
        .because(
            "controllers should map entities to DTOs instead of exposing/depending on them directly - " +
                "DistributionController, DistributionTicketController and DistributionTicketScreenController " +
                "are exempted for now as they still access entities directly",
        )
}
