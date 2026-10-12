package at.wrk.tafel.admin.backend.architecture

import at.wrk.tafel.admin.backend.TafelBaseIntegrationTest
import com.tngtech.archunit.base.DescribedPredicate
import com.tngtech.archunit.base.DescribedPredicate.not
import com.tngtech.archunit.core.domain.JavaClass
import com.tngtech.archunit.core.domain.properties.CanBeAnnotated.Predicates.annotatedWith
import com.tngtech.archunit.junit.AnalyzeClasses
import com.tngtech.archunit.junit.ArchTest
import com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes
import org.junit.jupiter.api.Test
import org.springframework.boot.builder.SpringApplicationBuilder
import org.springframework.boot.test.context.SpringBootTest
import org.testcontainers.postgresql.PostgreSQLContainer

@AnalyzeClasses(packages = ["at.wrk.tafel.admin.backend"])
internal class NamingConventionsTest {

    companion object {
        /**
         * An integration test that cannot take its context from the test framework - one that
         * stops the application, for instance - starts it with [SpringApplicationBuilder] against a
         * database container of its own, and so carries neither of the two marks the rules below
         * otherwise go by.
         */
        private val startTheApplicationThemselves: DescribedPredicate<JavaClass> =
            object : DescribedPredicate<JavaClass>("start the application against a database of their own") {
                override fun test(javaClass: JavaClass): Boolean = javaClass.methods.any { it.isAnnotatedWith(Test::class.java) } &&
                    dependsOn(javaClass, SpringApplicationBuilder::class.java) &&
                    dependsOn(javaClass, PostgreSQLContainer::class.java)

                private fun dependsOn(javaClass: JavaClass, target: Class<*>): Boolean = javaClass.directDependenciesFromSelf.any { it.targetClass.isEquivalentTo(target) }
            }
    }

    @ArchTest
    val `unittest classes are named properly` = classes().that()
        .containAnyMethodsThat(annotatedWith(Test::class.java))
        .and().areNotAnnotatedWith(SpringBootTest::class.java)
        .and().areNotAssignableTo(TafelBaseIntegrationTest::class.java)
        .and(not(startTheApplicationThemselves))
        .should().haveSimpleNameEndingWith("Test")

    @ArchTest
    val `integrationtest classes are named properly` = classes().that()
        .areAnnotatedWith(SpringBootTest::class.java)
        .or().areAssignableTo(TafelBaseIntegrationTest::class.java)
        .or(startTheApplicationThemselves)
        .and().doNotHaveSimpleName(TafelBaseIntegrationTest::class.java.simpleName)
        .should().haveSimpleNameEndingWith("IT")
}
