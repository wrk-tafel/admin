package at.wrk.tafel.admin.backend.common

/**
 * To exclude some things (like generated getters in data classes)
 * from jacoco test coverage.
 *
 * Re-verified for issue #3010, including an empirical check against this repo's own build (removed
 * this annotation from a two-property data class, ran `:backend:test`, and inspected the resulting
 * `jacocoTestReport` HTML): jacoco's own `KotlinGeneratedFilter` already recognizes Kotlin classes
 * via `@kotlin.Metadata` and drops `equals`/`hashCode`/`toString`/`copy`/`componentN` from the
 * report entirely on its own (this is what KT-18383 resolved - JetBrains declined to add a
 * `@kotlin.Generated` runtime annotation, jetbrains/kotlin#1655, and jacoco instead added native
 * detection instead, jacoco/jacoco#552 and #689) - so this annotation is no longer what protects
 * those members. What jacoco does *not* filter on its own is the plain property getters/setters
 * themselves (they retain line-number debug info, so they stay in the report) - those show up as
 * "missed" whenever a DTO's properties are only ever exercised through the generated `equals()` (as
 * most unit tests do via e.g. AssertJ's `isEqualTo`) rather than actually invoked through real
 * Jackson (de)serialization or explicit property access. That's the annotation's actual remaining
 * job: apply it to genuinely logic-free code (data classes, plain enums, field-only JPA entities,
 * thin exceptions, Spring `@Configuration` bean-wiring) to keep their boilerplate getters/setters
 * from diluting coverage metrics - not to classes that contain real, testable behavior.
 */
@Retention(AnnotationRetention.BINARY)
@Suppress("MatchingDeclarationName") // class itself needs to be named *Generated to be handled by jacoco
annotation class NoCoverageGenerated
typealias ExcludeFromTestCoverage = NoCoverageGenerated
