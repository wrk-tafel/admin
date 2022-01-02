package at.wrk.tafel.admin.backend.common

/**
 * To exclude some things (like generated getters in data classes)
 * from jacoco test coverage
 */
@Retention(AnnotationRetention.BINARY)
annotation class NoCoverageGenerated
typealias ExcludeFromTestCoverage = NoCoverageGenerated
