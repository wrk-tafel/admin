package at.wrk.tafel.admin.backend.architecture

import at.wrk.tafel.admin.backend.architecture.options.ExcludeDbMigrationImportOption
import com.tngtech.archunit.base.DescribedPredicate
import com.tngtech.archunit.core.domain.JavaClass
import com.tngtech.archunit.junit.AnalyzeClasses
import com.tngtech.archunit.junit.ArchTest
import com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses
import com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noFields
import com.tngtech.archunit.library.GeneralCodingRules
import com.tngtech.archunit.library.GeneralCodingRules.BE_ANNOTATED_WITH_AN_INJECTION_ANNOTATION

@AnalyzeClasses(packages = ["at.wrk.tafel.admin.backend"], importOptions = [ExcludeDbMigrationImportOption::class])
internal class GeneralCodingRulesTest {

    @ArchTest
    val `stdout and stderr shouldn't be used` = noClasses()
        .that().haveNameNotMatching(".*Test.*")
        .and().haveNameNotMatching(".*IT.*")
        .should(GeneralCodingRules.ACCESS_STANDARD_STREAMS)
        .because("test classes and mockk-generated code are allowed to access standard streams")

    @ArchTest
    val `no classes should use field injection` =
        noFields().that().areDeclaredInClassesThat().haveSimpleNameNotEndingWith("Test")
            .and().areDeclaredInClassesThat().haveSimpleNameNotEndingWith("IT")
            .should(BE_ANNOTATED_WITH_AN_INJECTION_ANNOTATION)

    @ArchTest
    val `generic exceptions shouldn't be thrown` = GeneralCodingRules.NO_CLASSES_SHOULD_THROW_GENERIC_EXCEPTIONS

    @ArchTest
    val `jodatime shouldn't be used anymore` = GeneralCodingRules.NO_CLASSES_SHOULD_USE_JODATIME

    @ArchTest
    val `java-util-logging shouldn't be used anymore` = GeneralCodingRules.NO_CLASSES_SHOULD_USE_JAVA_UTIL_LOGGING

}
