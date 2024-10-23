package at.wrk.tafel.admin.backend.architecture

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import com.tngtech.archunit.core.domain.properties.CanBeAnnotated.Predicates.annotatedWith
import com.tngtech.archunit.junit.AnalyzeClasses
import com.tngtech.archunit.junit.ArchTest
import com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes
import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Controller

@AnalyzeClasses(packages = ["at.wrk.tafel.admin.backend"])
internal class NamingConventionsTest {

    @ArchTest
    val `unittest classes are named properly` = classes().that()
        .containAnyMethodsThat(annotatedWith(Test::class.java))
        .and().areNotAnnotatedWith(SpringBootTest::class.java)
        .and().areNotAssignableTo(TafelBaseIntegrationTest::class.java)
        .should().haveSimpleNameEndingWith("Test")

    @ArchTest
    val `integrationtest classes are named properly` = classes().that()
        .areAnnotatedWith(SpringBootTest::class.java)
        .or().areAssignableTo(TafelBaseIntegrationTest::class.java)
        .and().doNotHaveSimpleName(TafelBaseIntegrationTest::class.java.simpleName)
        .should().haveSimpleNameEndingWith("IT")

    @ArchTest
    val `service classes are named properly` = classes().that()
        .areAnnotatedWith(org.springframework.stereotype.Service::class.java)
        .should().haveSimpleNameEndingWith("Service")
        .orShould().haveSimpleNameEndingWith("ServiceImpl")

    @ArchTest
    val `repository classes are named properly` = classes().that()
        .areInterfaces().and()
        .areAssignableTo(JpaRepository::class.java)
        .should().haveSimpleNameEndingWith("Repository")

    @ArchTest
    val `controller classes are named properly` = classes().that()
        .areAnnotatedWith(Controller::class.java)
        .should().haveSimpleNameEndingWith("Controller")

}
