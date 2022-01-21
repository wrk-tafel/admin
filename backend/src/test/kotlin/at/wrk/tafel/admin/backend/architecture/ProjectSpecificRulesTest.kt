package at.wrk.tafel.admin.backend.architecture

import at.wrk.tafel.admin.backend.common.rest.TafelRestController
import com.tngtech.archunit.junit.AnalyzeClasses
import com.tngtech.archunit.junit.ArchTest
import com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes
import org.springframework.web.bind.annotation.RestController

@AnalyzeClasses(packages = ["at.wrk.tafel.admin.backend"])
class ProjectSpecificRulesTest {

    @ArchTest
    val `annotation TafelRestController needs to be used instead RestController` = classes().that()
        .areNotAnnotations()
        .and().areAnnotatedWith(RestController::class.java)
        .and().areNotAnnotatedWith(TafelRestController::class.java)
        .should().beAnnotatedWith(TafelRestController::class.java)
        .andShould().notBeAnnotatedWith(RestController::class.java)

    @ArchTest
    val `annotations RestController and TafelRestController can't be used together` = classes().that()
        .areAnnotatedWith(RestController::class.java)
        .and().areAnnotatedWith(TafelRestController::class.java)
        .should().notBeAnnotatedWith(RestController::class.java)

}
