package at.wrk.tafel.admin.backend.common

/**
 * To exclude some things (like generated getters in data classes)
 * from jacoco test coverage
 */
@Retention(AnnotationRetention.BINARY)
@Suppress("MatchingDeclarationName") // class itself needs to be named *Generated to be handled by jacoco
annotation class NoCoverageGenerated
typealias ExcludeFromTestCoverage = NoCoverageGenerated
