package at.wrk.tafel.admin.backend.architecture

import com.tngtech.archunit.core.domain.properties.CanBeAnnotated.Predicates.annotatedWith
import com.tngtech.archunit.junit.AnalyzeClasses
import com.tngtech.archunit.junit.ArchTest
import com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes
import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest

@AnalyzeClasses(packages = ["at.wrk.tafel.admin.backend"])
class NamingConventionsTest {

    @ArchTest
    val `unittest classes are named properly` = classes().that()
        .containAnyMethodsThat(annotatedWith(Test::class.java))
        .and().areNotAnnotatedWith(SpringBootTest::class.java)
        .should().haveSimpleNameEndingWith("Test")

    @ArchTest
    val `integrationtest classes are named properly` = classes().that()
        .areAnnotatedWith(SpringBootTest::class.java)
        .should().haveSimpleNameEndingWith("IT")

}