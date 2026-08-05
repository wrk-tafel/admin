package at.wrk.tafel.admin.backend.common

/**
 * To exclude some things (like generated getters in data classes)
 * from jacoco test coverage.
 *
 * Still the right tool as of jacoco 0.8.14/Kotlin 2.x (re-verified for issue #3010): jacoco has
 * built-in support for skipping any class/method annotated with a type whose simple name matches
 * `*Generated` (since 0.8.2, retention must be CLASS or RUNTIME) - which is why this type is
 * physically named `NoCoverageGenerated`. There is no equivalent *automatic* filter for
 * Kotlin-compiler-generated data class members (`equals`/`hashCode`/`toString`/`copy`/`componentN`);
 * Kotlin's own tracking issue for that (KT-10608) is still open, and jacoco 0.8.13's Kotlin
 * improvements only cover constructors/`@JvmOverloads`, not data classes. So this annotation-based
 * workaround remains necessary - apply it to genuinely logic-free code (data classes, plain enums,
 * field-only JPA entities, thin exceptions, Spring `@Configuration` bean-wiring), not to classes
 * that contain real, testable behavior.
 */
@Retention(AnnotationRetention.BINARY)
@Suppress("MatchingDeclarationName") // class itself needs to be named *Generated to be handled by jacoco
annotation class NoCoverageGenerated
typealias ExcludeFromTestCoverage = NoCoverageGenerated
